import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  mapClassicApprovalItem,
  mapSchedulingItemRow,
} from "@/lib/approvals-scheduling/map-items";
import {
  dedupeUnifiedApprovalItems,
  isSchedulingRowAssignedToActor,
} from "@/lib/approvals-scheduling/approval-visibility";
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
import { hasPermission } from "@/lib/access-templates/effective-access";
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
import {
  SCHEDULING_LIST_SELECT,
  SCHEDULING_PREVIEW_SELECT,
} from "@/lib/approvals-scheduling/selects";
import { getTodayDateString } from "@/lib/utils/dates";
import { cache } from "react";
import type { ApprovalQueueItem } from "@/types/event-workspace";
import { isCommunicationApprovable } from "@/lib/event-workspace/approval-workflow";

function normalizeSchedulingListRow(
  row: Record<string, unknown>,
): ApprovalSchedulingItemRow {
  return {
    ...(row as unknown as ApprovalSchedulingItemRow),
    caption_text: (row.caption_text as string | null | undefined) ?? null,
    story_caption: (row.story_caption as string | null | undefined) ?? null,
  };
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

/** List rows may omit captions; artwork alone is enough to skip classic dedupe. */
function schedulingRowHasDisplayPreview(row: ApprovalSchedulingItemRow): boolean {
  return Boolean(
    row.feed_artwork_url ||
      row.story_artwork_url ||
      row.caption_text ||
      row.story_caption,
  );
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

const PENDING_SCHEDULING_STATUSES = ["assigned_to_me", "in_queue"] as const;

/** Org-scoped event ids for scheduling queries (request-deduped). */
const resolveScopedSchedulingEventIds = cache(
  async function resolveScopedSchedulingEventIds(): Promise<string[]> {
    const { resolveScopedOrgEventIds } = await import("@/lib/events/org-scope");
    return resolveScopedOrgEventIds(undefined);
  },
);

/**
 * Org-scoped scheduling rows for Approvals hub list (lean columns).
 * Caption bodies load on demand via fetchSchedulingItemPreviewFields.
 */
const fetchCampaignBuilderSchedulingItems = cache(
  async function fetchCampaignBuilderSchedulingItems(): Promise<
    ApprovalSchedulingItemRow[]
  > {
    const eventIds = await resolveScopedSchedulingEventIds();
    if (eventIds.length === 0) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("approval_scheduling_items")
      .select(SCHEDULING_LIST_SELECT)
      .in("event_id", eventIds)
      .order("requested_at", { ascending: false });

    if (error?.code === "42P01") {
      return [];
    }

    if (error) {
      console.error("Failed to fetch approval scheduling items:", error.message);
      return [];
    }

    return ((data ?? []) as unknown as Record<string, unknown>[]).map(
      normalizeSchedulingListRow,
    );
  },
);

export async function fetchSchedulingItemPreviewFields(
  schedulingItemId: string,
): Promise<{
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select(SCHEDULING_PREVIEW_SELECT)
    .eq("id", schedulingItemId)
    .maybeSingle();

  if (error?.code === "42P01" || error || !data) {
    return null;
  }

  const row = data as unknown as {
    caption_text: string | null;
    story_caption: string | null;
    feed_artwork_url: string | null;
    story_artwork_url: string | null;
  };

  return {
    captionText: row.caption_text,
    storyCaptionSnippet: row.story_caption,
    feedArtworkUrl: row.feed_artwork_url,
    storyArtworkUrl: row.story_artwork_url,
  };
}

function schedulingAssigneeOrFilter(actor: ApprovalActor): string {
  const parts = [`assigned_user_id.eq.${actor.organizationUserId}`];
  if (actor.organizationRoleId) {
    parts.push(
      `assigned_organization_role_id.eq.${actor.organizationRoleId}`,
    );
  }
  return parts.join(",");
}

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
  // Critical path: classic queue + CB2 scheduling rows only.
  // Full Calendar / Meta publish bundles are too heavy for the ≤2s hub budget;
  // scheduled/posted CB2 rows already cover the publishing tabs.
  const [role, membership, queue, schedulingRows, canViewAll] =
    await Promise.all([
      getCurrentCampaignRole(),
      getActiveMembership(),
      getApprovalQueueOverviewForCurrentUser(undefined, {
        enrichPreviews: false,
      }),
      fetchCampaignBuilderSchedulingItems(),
      hasPermission("approve_comms"),
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
    ...queue.recentlyApproved.slice(0, 25),
  ].map((item) => mapClassicApprovalItem(item, today));

  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
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
    canViewAll,
  };
});

export async function getUnifiedApprovalsSchedulingData(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsData();
}

/**
 * Lean sidebar scheduling badge totals — head-count queries only.
 * Does not materialize full approval_scheduling_items rows.
 */
export const getSidebarSchedulingBadgeCounts = cache(
  async function getSidebarSchedulingBadgeCounts(): Promise<{
    assignedApprovalsCount: number;
    changeRequestsCount: number;
  }> {
    const [membership, canApprove, eventIds] = await Promise.all([
      getActiveMembership(),
      hasPermission("approve_comms"),
      resolveScopedSchedulingEventIds(),
    ]);

    const actor: ApprovalActor | null = membership
      ? {
          organizationUserId: membership.user.id,
          organizationRoleId: membership.user.organizationRoleId,
          email: membership.user.email,
        }
      : null;

    if (!actor?.organizationUserId || eventIds.length === 0) {
      return { assignedApprovalsCount: 0, changeRequestsCount: 0 };
    }

    const supabase = await createClient();

    let assignedQuery = supabase
      .from("approval_scheduling_items")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds)
      .in("workflow_status", [...PENDING_SCHEDULING_STATUSES]);

    // Approvers see every pending item; others only rows assigned to them.
    if (!canApprove) {
      assignedQuery = assignedQuery.or(schedulingAssigneeOrFilter(actor));
    }

    const changeRequestsQuery = supabase
      .from("approval_scheduling_items")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds)
      .eq("workflow_status", "changes_requested")
      .eq("requested_by_user_id", actor.organizationUserId);

    const [assignedResult, changeRequestsResult] = await Promise.all([
      assignedQuery,
      changeRequestsQuery,
    ]);

    if (assignedResult.error?.code !== "42P01" && assignedResult.error) {
      console.error(
        "Failed to count assigned scheduling badges:",
        assignedResult.error.message,
      );
    }
    if (
      changeRequestsResult.error?.code !== "42P01" &&
      changeRequestsResult.error
    ) {
      console.error(
        "Failed to count change-request scheduling badges:",
        changeRequestsResult.error.message,
      );
    }

    return {
      assignedApprovalsCount:
        assignedResult.error && assignedResult.error.code !== "42P01"
          ? 0
          : (assignedResult.count ?? 0),
      changeRequestsCount:
        changeRequestsResult.error &&
        changeRequestsResult.error.code !== "42P01"
          ? 0
          : (changeRequestsResult.count ?? 0),
    };
  },
);

export async function getChangeRequestsSchedulingCount(): Promise<number> {
  const { changeRequestsCount } = await getSidebarSchedulingBadgeCounts();
  return changeRequestsCount;
}

export async function getAssignedApprovalsSchedulingCount(): Promise<number> {
  const { assignedApprovalsCount } = await getSidebarSchedulingBadgeCounts();
  return assignedApprovalsCount;
}

/** Exact-event scheduling rows — Event Detail Approvals tab (lean list columns). */
async function fetchSchedulingItemsForEvent(
  eventId: string,
): Promise<ApprovalSchedulingItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select(SCHEDULING_LIST_SELECT)
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

  return ((data ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeSchedulingListRow,
  );
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

  // Meta bundles only when list rows lack artwork (captions load on Review open).
  const needsMetaPreview = schedulingRows.some(
    (row) => !row.feed_artwork_url && !row.story_artwork_url,
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
    canViewAll: await hasPermission("approve_comms"),
  };
}
