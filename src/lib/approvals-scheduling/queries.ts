import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canApproveDraft } from "@/lib/auth/campaign-roles";
import { getPlanningCalendarData } from "@/lib/communications-calendar/planning-queries";
import {
  mapClassicApprovalItem,
  mapPlanningPublishingItem,
  mapSchedulingItemRow,
} from "@/lib/approvals-scheduling/map-items";
import {
  dedupeUnifiedApprovalItems,
  isPendingSchedulingRow,
  isSchedulingRowAssignedToActor,
} from "@/lib/approvals-scheduling/approval-visibility";
import { canViewAllApprovals } from "@/lib/approvals-scheduling/permissions";
import { summarizeCounts } from "@/lib/approvals-scheduling/status";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalsPageData,
  UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
import { milestoneNameMatchKey } from "@/lib/campaign-builder-v2/milestone-names";
import {
  classicQueueNeedsPreviewEnrichment,
  enrichApprovalQueuePreviewsForItems,
  getApprovalQueueOverviewForCurrentUser,
  resolveApprovalQueueBaseForEvent,
} from "@/lib/event-workspace/approval-routing-queries";
import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventDetailTabContext } from "@/lib/events-phase3/tab-context";
import {
  elapsedMs,
  logTabTiming,
  startTabTimer,
} from "@/lib/events-phase3/tab-timing";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/utils/dates";
import { cache } from "react";
import type { ApprovalQueueItem } from "@/types/event-workspace";
import { isCommunicationApprovable } from "@/lib/event-workspace/approval-workflow";

function isPublishedPlanningItem(
  item: import("@/types/communications-calendar").PlanningCalendarItem,
): boolean {
  return item.publishStatus === "published" || item.status === "published";
}

function relativeDayFromPlanningSourceId(
  sourceId: string,
  eventId: string,
): number | null {
  const prefix = `${eventId}-`;
  if (!sourceId.startsWith(prefix)) {
    return null;
  }
  const day = Number(sourceId.slice(prefix.length));
  return Number.isFinite(day) ? day : null;
}

async function loadMetaBundlesByEvent(
  eventIds: string[],
): Promise<Map<string, MetaPublishBundle[]>> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const lists = await Promise.all(
    uniqueIds.map(async (eventId) => getMetaPublishBundles(eventId)),
  );

  return new Map(
    uniqueIds.map((eventId, index) => [eventId, lists[index] ?? []]),
  );
}

function previewAssetsFromBundle(
  bundle: MetaPublishBundle | null | undefined,
): {
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
} | undefined {
  if (!bundle) {
    return undefined;
  }

  return {
    captionText: bundle.captionPreview,
    storyCaptionSnippet: bundle.storyCaptionPreview,
    feedArtworkUrl: bundle.feedArtworkUrl,
    storyArtworkUrl: bundle.storyArtworkUrl,
  };
}

function schedulingRowHasDisplayPreview(row: ApprovalSchedulingItemRow): boolean {
  const hasArtwork = Boolean(row.feed_artwork_url || row.story_artwork_url);
  const hasCaption = Boolean(row.caption_text || row.story_caption);
  return hasArtwork && hasCaption;
}

function previewAssetsFromSchedulingRow(
  row: ApprovalSchedulingItemRow | undefined,
): {
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
} | undefined {
  if (!row) {
    return undefined;
  }

  const hasArtwork = Boolean(row.feed_artwork_url || row.story_artwork_url);
  const hasCaption = Boolean(row.caption_text || row.story_caption);
  if (!hasArtwork && !hasCaption) {
    return undefined;
  }

  return {
    captionText: row.caption_text,
    storyCaptionSnippet: row.story_caption,
    feedArtworkUrl: row.feed_artwork_url,
    storyArtworkUrl: row.story_artwork_url,
  };
}

/** Org-scoped scheduling rows (request-deduped). Shared by badge counts + Approvals hub. */
const fetchCampaignBuilderSchedulingItems = cache(
  async function fetchCampaignBuilderSchedulingItems(): Promise<
    ApprovalSchedulingItemRow[]
  > {
    const { resolveScopedOrganizationId, getOrganizationSchoolYearIds } =
      await import("@/lib/events/org-scope");
    const scopedOrgId = await resolveScopedOrganizationId(undefined);
    if (!scopedOrgId) {
      return [];
    }

    const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
    if (!schoolYearIds.length) {
      return [];
    }

    const supabase = await createClient();
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id")
      .in("school_year_id", schoolYearIds);

    if (eventsError?.code === "42P01" || eventsError) {
      return [];
    }

    const eventIds = (events ?? []).map((row) => row.id as string);
    if (eventIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("approval_scheduling_items")
      .select("*")
      .in("event_id", eventIds)
      .order("requested_at", { ascending: false });

    if (error?.code === "42P01") {
      return [];
    }

    if (error) {
      console.error("Failed to fetch approval scheduling items:", error.message);
      return [];
    }

    return (data ?? []) as ApprovalSchedulingItemRow[];
  },
);

type AssigneeLookup = { name: string; role: string };

async function loadAssigneeLookups(
  rows: ApprovalSchedulingItemRow[],
): Promise<{
  byUserId: Map<string, AssigneeLookup>;
  byRoleId: Map<string, AssigneeLookup>;
}> {
  const userIds = [
    ...new Set(rows.map((row) => row.assigned_user_id).filter(Boolean)),
  ] as string[];
  const roleIds = [
    ...new Set(
      rows
        .filter((row) => !row.assigned_user_id && row.assigned_organization_role_id)
        .map((row) => row.assigned_organization_role_id)
        .filter(Boolean),
    ),
  ] as string[];

  const supabase = await createClient();
  const byUserId = new Map<string, AssigneeLookup>();
  const byRoleId = new Map<string, AssigneeLookup>();

  const [usersResult, rolesResult] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("organization_users")
          .select("id, email, organization_roles ( name )")
          .in("id", userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    roleIds.length > 0
      ? supabase
          .from("organization_roles")
          .select("id, name, contact_name")
          .in("id", roleIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  for (const row of usersResult.data ?? []) {
    const data = row as {
      id: string;
      email?: string | null;
      organization_roles?:
        | { name: string | null }
        | Array<{ name: string | null }>
        | null;
    };
    const orgRole = data.organization_roles;
    const roleName = Array.isArray(orgRole)
      ? orgRole[0]?.name
      : orgRole?.name;
    byUserId.set(data.id, {
      name: data.email ?? "Approver",
      role: roleName ?? "Committee Chair",
    });
  }

  for (const row of rolesResult.data ?? []) {
    const data = row as {
      id: string;
      name?: string | null;
      contact_name?: string | null;
    };
    byRoleId.set(data.id, {
      name: data.contact_name?.trim() || data.name || "Board",
      role: data.name ?? "Committee Chair",
    });
  }

  return { byUserId, byRoleId };
}

function resolveAssigneeFromLookups(
  row: ApprovalSchedulingItemRow,
  lookups: {
    byUserId: Map<string, AssigneeLookup>;
    byRoleId: Map<string, AssigneeLookup>;
  },
): AssigneeLookup {
  if (row.assigned_user_id) {
    return (
      lookups.byUserId.get(row.assigned_user_id) ?? {
        name: "Approver",
        role: "Committee Chair",
      }
    );
  }

  if (row.assigned_organization_role_id) {
    return (
      lookups.byRoleId.get(row.assigned_organization_role_id) ?? {
        name: "Board",
        role: "Committee Chair",
      }
    );
  }

  return { name: "System", role: "System" };
}

function isSubmittedByActor(
  row: ApprovalSchedulingItemRow,
  actor: ApprovalActor | null,
): boolean {
  if (!actor?.organizationUserId) {
    return false;
  }

  return row.requested_by_user_id === actor.organizationUserId;
}

const resolveUnifiedApprovalsData = cache(async function resolveUnifiedApprovalsData(): Promise<UnifiedApprovalsPageData> {
  const today = getTodayDateString();
  const [role, membership, queue, planning, schedulingRows] = await Promise.all([
    getCurrentCampaignRole(),
    getActiveMembership(),
    getApprovalQueueOverviewForCurrentUser(),
    getPlanningCalendarData(),
    fetchCampaignBuilderSchedulingItems(),
  ]);

  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  const classicItems = [
    ...queue.assignedToMe,
    ...queue.allPending.filter((item) => !item.assignedToMe),
    ...queue.changesRequested,
    ...queue.recentlyApproved,
  ].map((item) => mapClassicApprovalItem(item, today));

  const metaItems = planning.items.filter(
    (item) => item.communicationType === "meta_milestone",
  );

  const publishingCandidates = metaItems.filter(
    (item) =>
      isPublishedPlanningItem(item) ||
      item.publishStatus === "scheduled" ||
      item.status === "scheduled" ||
      item.publishStatus === "posting" ||
      (!isPublishedPlanningItem(item) && item.scheduledDate <= today),
  );

  const schedulingByEventMilestone = new Map<string, ApprovalSchedulingItemRow>();
  for (const row of schedulingRows) {
    schedulingByEventMilestone.set(
      `${row.event_id}:${milestoneNameMatchKey(row.milestone_name)}`,
      row,
    );
  }

  const bundlesByEvent = await loadMetaBundlesByEvent(
    publishingCandidates.map((item) => item.eventId),
  );

  const publishingItems = publishingCandidates.map((item) => {
    const milestoneName = item.timelineStepTitle ?? item.title;
    const cb2Row = schedulingByEventMilestone.get(
      `${item.eventId}:${milestoneNameMatchKey(milestoneName)}`,
    );
    const relativeDay = relativeDayFromPlanningSourceId(
      item.sourceId,
      item.eventId,
    );
    const bundles = bundlesByEvent.get(item.eventId) ?? [];
    const bundle =
      (relativeDay === null
        ? null
        : bundles.find((entry) => entry.relativeDay === relativeDay)) ??
      bundles.find(
        (entry) =>
          milestoneNameMatchKey(entry.title) ===
          milestoneNameMatchKey(milestoneName),
      );

    const assets =
      previewAssetsFromSchedulingRow(cb2Row) ??
      previewAssetsFromBundle(bundle);

    return mapPlanningPublishingItem(item, today, new Date(), assets);
  });

  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const item of publishingItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const row of schedulingRows) {
    if (row.campaign_name) {
      eventTitleById.set(row.event_id, row.campaign_name);
    }
  }

  const assigneeLookups = await loadAssigneeLookups(schedulingRows);
  const cb2Items: UnifiedApprovalItem[] = [];
  for (const row of schedulingRows) {
    const assignee = resolveAssigneeFromLookups(row, assigneeLookups);
    cb2Items.push(
      mapSchedulingItemRow(
        row,
        eventTitleById.get(row.event_id) ?? row.campaign_name ?? "Campaign",
        assignee.name,
        assignee.role,
        isSchedulingRowAssignedToActor(row, actor),
        isSubmittedByActor(row, actor),
      ),
    );
  }

  const items = dedupeUnifiedApprovalItems([
    ...classicItems,
    ...cb2Items,
    ...publishingItems,
  ]).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));

  const counts = summarizeCounts(items);
  const campaigns = [
    ...new Map(
      items.map((item) => [item.eventId, { id: item.eventId, title: item.eventTitle }]),
    ).values(),
  ].sort((left, right) => left.title.localeCompare(right.title));

  return {
    items,
    summary: {
      inQueue: counts.in_queue,
      assignedToMe: counts.assigned_to_me,
      scheduled: counts.scheduled,
      posted: counts.posted,
      published: counts.published,
      changesRequested: counts.changes_requested,
    },
    campaigns,
    actorEmail: actor?.email ?? null,
    actorUserId: actor?.organizationUserId ?? null,
    actorRoleId: actor?.organizationRoleId ?? null,
    role,
    canViewAll: canViewAllApprovals(role),
  };
});

export async function getUnifiedApprovalsSchedulingData(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsData();
}

export async function getChangeRequestsSchedulingCount(): Promise<number> {
  const membership = await getActiveMembership();
  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  if (!actor?.organizationUserId) {
    return 0;
  }

  const rows = await fetchCampaignBuilderSchedulingItems();
  return rows.filter(
    (row) =>
      row.workflow_status === "changes_requested" &&
      row.requested_by_user_id === actor.organizationUserId,
  ).length;
}

export async function getAssignedApprovalsSchedulingCount(): Promise<number> {
  const [membership, role] = await Promise.all([
    getActiveMembership(),
    getCurrentCampaignRole(),
  ]);
  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  if (!actor?.organizationUserId) {
    return 0;
  }

  const rows = await fetchCampaignBuilderSchedulingItems();
  const canApprove = canApproveDraft(role);

  return rows.filter((row) => {
    if (!isPendingSchedulingRow(row)) {
      return false;
    }

    // Approvers should see the nav badge for anything still waiting in Approvals.
    if (canApprove) {
      return true;
    }

    return isSchedulingRowAssignedToActor(row, actor);
  }).length;
}

/**
 * Combined sidebar scheduling badge totals — one shared fetch for both counts.
 */
export const getSidebarSchedulingBadgeCounts = cache(
  async function getSidebarSchedulingBadgeCounts(): Promise<{
    assignedApprovalsCount: number;
    changeRequestsCount: number;
  }> {
    const [assignedApprovalsCount, changeRequestsCount] = await Promise.all([
      getAssignedApprovalsSchedulingCount(),
      getChangeRequestsSchedulingCount(),
    ]);
    return { assignedApprovalsCount, changeRequestsCount };
  },
);

/** Exact-event scheduling rows — Event Detail Approvals tab. */
async function fetchSchedulingItemsForEvent(
  eventId: string,
): Promise<ApprovalSchedulingItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("event_id", eventId)
    .order("requested_at", { ascending: false });

  if (error?.code === "42P01") {
    return [];
  }
  if (error) {
    console.error(
      "Failed to fetch event approval scheduling items:",
      error.message,
    );
    return [];
  }

  return (data ?? []) as ApprovalSchedulingItemRow[];
}

function splitQueueOverview(
  enriched: ApprovalQueueItem[],
  actor: ApprovalActor | null,
) {
  const pending = enriched.filter(
    (item) =>
      item.status === "pending" &&
      isCommunicationApprovable(item.communicationStatus),
  );
  return {
    assignedToMe: pending.filter((item) => item.assignedToMe),
    allPending: pending,
    changesRequested: enriched.filter(
      (item) => item.communicationStatus === "changes_requested",
    ),
    recentlyApproved: enriched.filter((item) => item.status === "approved"),
    actor,
  };
}

/**
 * Event Detail Approvals tab — exact eventId only.
 * No planning calendar, no unrelated events.
 * Meta/version/step enrichment only when preview fields are missing.
 */
export async function getUnifiedApprovalsSchedulingDataForEvent(
  eventId: string,
  context?: Pick<EventDetailTabContext, "campaignRole" | "membership">,
): Promise<UnifiedApprovalsPageData> {
  const totalStarted = startTabTimer();
  const today = getTodayDateString();

  const authStarted = startTabTimer();
  const primaryStarted = startTabTimer();
  const [role, membership, queueBase, schedulingRows] = await Promise.all([
    context?.campaignRole
      ? Promise.resolve(context.campaignRole)
      : getCurrentCampaignRole(),
    context?.membership
      ? Promise.resolve(context.membership)
      : getActiveMembership(),
    resolveApprovalQueueBaseForEvent(eventId),
    fetchSchedulingItemsForEvent(eventId),
  ]);
  const authContextMs = elapsedMs(authStarted);
  const primaryQueryMs = elapsedMs(primaryStarted);

  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  const coveredCommunicationIds = new Set(
    schedulingRows
      .filter(schedulingRowHasDisplayPreview)
      .map((row) => row.communication_item_id)
      .filter((value): value is string => Boolean(value)),
  );

  const classicCandidates = queueBase.items.filter((item) => {
    if (item.eventId !== eventId) {
      return false;
    }
    if (
      item.communicationItemId &&
      coveredCommunicationIds.has(item.communicationItemId)
    ) {
      return false;
    }
    return true;
  });

  let previewEnrichmentMs = 0;
  let queueItems = queueBase.items;
  if (
    classicCandidates.length > 0 &&
    classicQueueNeedsPreviewEnrichment(classicCandidates)
  ) {
    const previewStarted = startTabTimer();
    const classicIds = new Set(classicCandidates.map((item) => item.id));
    const rowsToEnrich = queueBase.rows.filter((row) => classicIds.has(row.id));
    const itemsToEnrich = queueBase.items.filter((item) =>
      classicIds.has(item.id),
    );
    const enrichedSubset = await enrichApprovalQueuePreviewsForItems(
      rowsToEnrich,
      itemsToEnrich,
    );
    const enrichedById = new Map(enrichedSubset.map((item) => [item.id, item]));
    queueItems = queueBase.items.map(
      (item) => enrichedById.get(item.id) ?? item,
    );
    previewEnrichmentMs = elapsedMs(previewStarted);
  }

  const queue = splitQueueOverview(queueItems, actor);

  const classicItems = [
    ...queue.assignedToMe,
    ...queue.allPending.filter((item) => !item.assignedToMe),
    ...queue.changesRequested,
    ...queue.recentlyApproved,
  ]
    .filter((item) => item.eventId === eventId)
    .map((item) => mapClassicApprovalItem(item, today));

  const needsMetaPreview = schedulingRows.some(
    (row) => !schedulingRowHasDisplayPreview(row),
  );
  let metaPreviewMs = 0;
  let bundles: MetaPublishBundle[] = [];
  if (needsMetaPreview) {
    const metaStarted = startTabTimer();
    const bundlesByEvent = await loadMetaBundlesByEvent([eventId]);
    bundles = bundlesByEvent.get(eventId) ?? [];
    metaPreviewMs = elapsedMs(metaStarted);
    previewEnrichmentMs += metaPreviewMs;
  }

  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const row of schedulingRows) {
    if (row.campaign_name) {
      eventTitleById.set(row.event_id, row.campaign_name);
    }
  }

  const assigneeStarted = startTabTimer();
  const assigneeLookups = await loadAssigneeLookups(schedulingRows);
  const assigneeEnrichmentMs = elapsedMs(assigneeStarted);

  const dtoStarted = startTabTimer();
  const cb2Items: UnifiedApprovalItem[] = [];
  for (const row of schedulingRows) {
    const assignee = resolveAssigneeFromLookups(row, assigneeLookups);
    const bundle =
      bundles.find(
        (entry) =>
          milestoneNameMatchKey(entry.title) ===
          milestoneNameMatchKey(row.milestone_name),
      ) ?? null;
    const fromRow = previewAssetsFromSchedulingRow(row);
    const fromBundle = previewAssetsFromBundle(bundle);
    const assets =
      fromRow || fromBundle
        ? {
            captionText: fromRow?.captionText ?? fromBundle?.captionText ?? null,
            storyCaptionSnippet:
              fromRow?.storyCaptionSnippet ??
              fromBundle?.storyCaptionSnippet ??
              null,
            feedArtworkUrl:
              fromRow?.feedArtworkUrl ?? fromBundle?.feedArtworkUrl ?? null,
            storyArtworkUrl:
              fromRow?.storyArtworkUrl ?? fromBundle?.storyArtworkUrl ?? null,
          }
        : undefined;

    const mapped = mapSchedulingItemRow(
      row,
      eventTitleById.get(row.event_id) ?? row.campaign_name ?? "Campaign",
      assignee.name,
      assignee.role,
      isSchedulingRowAssignedToActor(row, actor),
      isSubmittedByActor(row, actor),
    );
    cb2Items.push({
      ...mapped,
      preview: assets
        ? {
            captionText: assets.captionText,
            storyCaptionSnippet: assets.storyCaptionSnippet,
            feedArtworkUrl: assets.feedArtworkUrl,
            storyArtworkUrl: assets.storyArtworkUrl,
          }
        : mapped.preview,
    });
  }

  const items = dedupeUnifiedApprovalItems([...classicItems, ...cb2Items]).sort(
    (left, right) => right.requestedAt.localeCompare(left.requestedAt),
  );

  const counts = summarizeCounts(items);
  const campaigns = [
    ...new Map(
      items.map((item) => [item.eventId, { id: item.eventId, title: item.eventTitle }]),
    ).values(),
  ].sort((left, right) => left.title.localeCompare(right.title));
  const dtoMappingMs = elapsedMs(dtoStarted);

  logTabTiming("approvals", eventId, {
    totalMs: elapsedMs(totalStarted),
    authContextMs,
    primaryQueryMs,
    assigneeEnrichmentMs,
    previewEnrichmentMs,
    dtoMappingMs,
  });

  return {
    items,
    summary: {
      inQueue: counts.in_queue,
      assignedToMe: counts.assigned_to_me,
      scheduled: counts.scheduled,
      posted: counts.posted,
      published: counts.published,
      changesRequested: counts.changes_requested,
    },
    campaigns,
    actorEmail: actor?.email ?? null,
    actorUserId: actor?.organizationUserId ?? null,
    actorRoleId: actor?.organizationRoleId ?? null,
    role,
    canViewAll: canViewAllApprovals(role),
  };
}
