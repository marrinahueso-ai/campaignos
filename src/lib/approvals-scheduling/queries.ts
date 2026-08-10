import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { isNewsletterMilestoneId } from "@/lib/newsletter/approval";
import {
  attachNewsletterPreviewsToItems,
  loadNewsletterApprovalPreviews,
} from "@/lib/newsletter/approval-previews";
import {
  mapClassicApprovalItem,
  mapSchedulingItemRow,
} from "@/lib/approvals-scheduling/map-items";
import {
  dedupeUnifiedApprovalItems,
  isSchedulingRowAssignedToActor,
} from "@/lib/approvals-scheduling/approval-visibility";
import {
  applyLiveMilestoneNames,
  loadLiveMilestoneNamesById,
} from "@/lib/approvals-scheduling/live-milestone-names";
import {
  applyMetaSlotOutcomesToApprovalItem,
  loadMetaSlotOutcomesForEvents,
} from "@/lib/approvals-scheduling/publish-outcome-sync";
import { computeApprovalsEasePulseCounts } from "@/lib/approvals-scheduling/approvals-ease-pulse";
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
  APPROVALS_HUB_DEFERRED_WORKFLOW_STATUSES,
  APPROVALS_HUB_INITIAL_WORKFLOW_STATUSES,
  SCHEDULING_EVENT_FETCH_CAP,
  SCHEDULING_ORG_FETCH_CAP,
  SCHEDULING_STATUS_INDEX_SELECT,
} from "@/lib/approvals-scheduling/constants";
import {
  campaignsFromStatusIndex,
  computePulseCountsFromStatusIndex,
  summarizeStatusIndex,
  type SchedulingStatusIndexRow,
} from "@/lib/approvals-scheduling/hub-initial-payload";
import {
  SCHEDULING_LIST_SELECT,
  SCHEDULING_PREVIEW_SELECT,
} from "@/lib/approvals-scheduling/selects";
import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";
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

/** Current org id for org-scoped (event_id NULL) scheduling rows, e.g. newsletters. */
const resolveSchedulingOrganizationId = cache(
  async function resolveSchedulingOrganizationId(): Promise<string | null> {
    const organization = await getCurrentOrganization();
    return organization?.id ?? null;
  },
);

function dedupeSchedulingRowsById(
  rowLists: ApprovalSchedulingItemRow[][],
): ApprovalSchedulingItemRow[] {
  const byId = new Map<string, ApprovalSchedulingItemRow>();
  for (const rows of rowLists) {
    for (const row of rows) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()]
    .sort((left, right) => right.requested_at.localeCompare(left.requested_at))
    .slice(0, SCHEDULING_ORG_FETCH_CAP);
}

/**
 * Org-scoped rows with `event_id IS NULL` (currently only newsletters).
 * Kept as a narrow, defense-in-depth query: filters on `organization_id`
 * at the DB layer, then double-checks the newsletter milestone prefix here
 * so any future org-scoped row type must opt in explicitly.
 */
async function fetchOrgScopedNewsletterSchedulingItems(
  workflowStatuses?: readonly UnifiedWorkflowStatus[],
): Promise<ApprovalSchedulingItemRow[]> {
  const organizationId = await resolveSchedulingOrganizationId();
  if (!organizationId) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("approval_scheduling_items")
    .select(SCHEDULING_LIST_SELECT)
    .eq("organization_id", organizationId)
    .is("event_id", null)
    .order("requested_at", { ascending: false })
    .limit(SCHEDULING_ORG_FETCH_CAP);

  if (workflowStatuses && workflowStatuses.length > 0) {
    query = query.in("workflow_status", [...workflowStatuses]);
  }

  const { data, error } = await query;

  if (error?.code === "42P01") {
    return [];
  }
  if (error) {
    console.error(
      "Failed to fetch org-scoped approval scheduling items:",
      error.message,
    );
    return [];
  }

  return ((data ?? []) as unknown as Record<string, unknown>[])
    .map(normalizeSchedulingListRow)
    .filter((row) => isNewsletterMilestoneId(row.campaign_milestone_id));
}

/**
 * Org-scoped scheduling rows for Approvals hub list (lean columns).
 * Caption bodies load on demand via fetchSchedulingItemPreviewFields.
 * Optional workflow_status filter supports hub SSR deferral of terminal rows.
 * Includes both event-scoped rows (social/flyer) and organization-scoped
 * rows with no event (newsletters).
 */
async function fetchCampaignBuilderSchedulingItems(
  workflowStatuses?: readonly UnifiedWorkflowStatus[],
): Promise<ApprovalSchedulingItemRow[]> {
  const eventIds = await resolveScopedSchedulingEventIds();
  const [eventRows, orgRows] = await Promise.all([
    eventIds.length > 0
      ? (async () => {
          const supabase = await createClient();
          let query = supabase
            .from("approval_scheduling_items")
            .select(SCHEDULING_LIST_SELECT)
            .in("event_id", eventIds)
            .order("requested_at", { ascending: false })
            .limit(SCHEDULING_ORG_FETCH_CAP);

          if (workflowStatuses && workflowStatuses.length > 0) {
            query = query.in("workflow_status", [...workflowStatuses]);
          }

          const { data, error } = await query;

          if (error?.code === "42P01") {
            return [] as ApprovalSchedulingItemRow[];
          }
          if (error) {
            console.error(
              "Failed to fetch approval scheduling items:",
              error.message,
            );
            return [] as ApprovalSchedulingItemRow[];
          }

          return ((data ?? []) as unknown as Record<string, unknown>[]).map(
            normalizeSchedulingListRow,
          );
        })()
      : Promise.resolve([] as ApprovalSchedulingItemRow[]),
    fetchOrgScopedNewsletterSchedulingItems(workflowStatuses),
  ]);

  if (eventIds.length === 0 && orgRows.length === 0) {
    return [];
  }

  return dedupeSchedulingRowsById([eventRows, orgRows]);
}

/** Thin index of all statuses — pulse/summary/campaigns without full list DTOs. */
async function fetchSchedulingStatusIndex(): Promise<SchedulingStatusIndexRow[]> {
  const [eventIds, organizationId] = await Promise.all([
    resolveScopedSchedulingEventIds(),
    resolveSchedulingOrganizationId(),
  ]);
  if (eventIds.length === 0 && !organizationId) {
    return [];
  }

  const supabase = await createClient();
  const queries: PromiseLike<{
    data: unknown[] | null;
    error: { code?: string; message: string } | null;
  }>[] = [];

  if (eventIds.length > 0) {
    queries.push(
      supabase
        .from("approval_scheduling_items")
        .select(SCHEDULING_STATUS_INDEX_SELECT)
        .in("event_id", eventIds)
        .order("requested_at", { ascending: false })
        .limit(SCHEDULING_ORG_FETCH_CAP),
    );
  }
  if (organizationId) {
    queries.push(
      supabase
        .from("approval_scheduling_items")
        .select(SCHEDULING_STATUS_INDEX_SELECT)
        .eq("organization_id", organizationId)
        .is("event_id", null)
        .order("requested_at", { ascending: false })
        .limit(SCHEDULING_ORG_FETCH_CAP),
    );
  }

  const results = await Promise.all(queries);
  const byId = new Map<string, SchedulingStatusIndexRow>();
  for (const { data, error } of results) {
    if (error?.code === "42P01") {
      continue;
    }
    if (error) {
      console.error(
        "Failed to fetch approval scheduling status index:",
        error.message,
      );
      continue;
    }
    for (const row of (data ?? []) as unknown as SchedulingStatusIndexRow[]) {
      byId.set(row.id, row);
    }
  }

  return [...byId.values()].slice(0, SCHEDULING_ORG_FETCH_CAP);
}

export async function fetchSchedulingItemPreviewFields(
  schedulingItemId: string,
  eventId: string,
): Promise<{
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
} | null> {
  const { getEventById } = await import("@/lib/events/queries");
  const event = await getEventById(eventId);
  if (!event) {
    return null;
  }

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
    event_id: string;
    caption_text: string | null;
    story_caption: string | null;
    feed_artwork_url: string | null;
    story_artwork_url: string | null;
  };

  // Tenant guard: never return captions/artwork URLs for another event's row.
  if (row.event_id !== eventId) {
    return null;
  }

  return {
    captionText: row.caption_text,
    storyCaptionSnippet: row.story_caption,
    feedArtworkUrl: row.feed_artwork_url,
    storyArtworkUrl: row.story_artwork_url,
  };
}

/**
 * Preview fields for organization-scoped rows (newsletters) — no `eventId`
 * to guard with, so tenant-checks against the caller's current organization.
 */
export async function fetchNewsletterSchedulingItemPreviewFields(
  schedulingItemId: string,
): Promise<{
  captionText: string | null;
  storyCaptionSnippet: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
} | null> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select(`${SCHEDULING_PREVIEW_SELECT}, organization_id`)
    .eq("id", schedulingItemId)
    .maybeSingle();

  if (error?.code === "42P01" || error || !data) {
    return null;
  }

  const row = data as unknown as {
    organization_id: string | null;
    caption_text: string | null;
    story_caption: string | null;
    feed_artwork_url: string | null;
    story_artwork_url: string | null;
  };

  // Tenant guard: never return captions/artwork URLs for another org's row.
  if (row.organization_id !== organization.id) {
    return null;
  }

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
          .select("id, email, display_name, organization_roles ( name )")
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
      display_name?: string | null;
      organization_roles?:
        | { name: string | null }
        | Array<{ name: string | null }>
        | null;
    };
    const orgRole = data.organization_roles;
    const roleName = Array.isArray(orgRole)
      ? orgRole[0]?.name
      : orgRole?.name;
    const displayName = data.display_name?.trim();
    byUserId.set(data.id, {
      name: displayName || data.email || "Approver",
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

async function mapSchedulingRowsToUnifiedItems(input: {
  schedulingRows: ApprovalSchedulingItemRow[];
  classicItems: UnifiedApprovalItem[];
  actor: ApprovalActor | null;
  leanEnrich: boolean;
}): Promise<UnifiedApprovalItem[]> {
  const { schedulingRows, classicItems, actor, leanEnrich } = input;
  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const row of schedulingRows) {
    if (row.event_id && row.campaign_name) {
      eventTitleById.set(row.event_id, row.campaign_name);
    }
  }

  const enrichEventIds = [
    ...new Set([
      ...classicItems.map((item) => item.eventId),
      ...schedulingRows
        .map((row) => row.event_id)
        .filter((eventId): eventId is string => Boolean(eventId)),
    ]),
  ];

  const [assigneeLookups, liveNames, slotOutcomes] = await Promise.all([
    loadAssigneeLookups(schedulingRows),
    leanEnrich
      ? Promise.resolve(new Map<string, string>())
      : loadLiveMilestoneNamesById(enrichEventIds),
    leanEnrich
      ? Promise.resolve([] as Awaited<
          ReturnType<typeof loadMetaSlotOutcomesForEvents>
        >)
      : loadMetaSlotOutcomesForEvents(enrichEventIds),
  ]);

  const cb2Items: UnifiedApprovalItem[] = [];
  for (const row of schedulingRows) {
    const assignee = resolveAssigneeFromLookups(row, assigneeLookups);
    cb2Items.push(
      mapSchedulingItemRow(
        row,
        (row.event_id ? eventTitleById.get(row.event_id) : undefined) ??
          row.campaign_name ??
          "Campaign",
        assignee.name,
        assignee.role,
        isSchedulingRowAssignedToActor(row, actor),
        isSubmittedByActor(row, actor),
      ),
    );
  }

  const deduped = dedupeUnifiedApprovalItems([...classicItems, ...cb2Items]);
  const named = leanEnrich
    ? deduped
    : applyLiveMilestoneNames(deduped, liveNames);

  const withMeta = (
    leanEnrich
      ? named
      : named.map((item) =>
          applyMetaSlotOutcomesToApprovalItem(item, slotOutcomes),
        )
  ).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));

  const newsletterPreviews = await loadNewsletterApprovalPreviews(withMeta);
  return attachNewsletterPreviewsToItems(withMeta, newsletterPreviews);
}

async function buildUnifiedApprovalsPageData(options?: {
  /** Skip live milestone names + Meta slot overlay (Dashboard widgets). */
  leanEnrich?: boolean;
  /**
   * Org Approvals hub: omit scheduled/posted/published detail rows from SSR.
   * Pulse counts still include every status via a thin index.
   */
  deferTerminalDetailRows?: boolean;
}): Promise<UnifiedApprovalsPageData> {
  const leanEnrich = options?.leanEnrich === true;
  const deferTerminalDetailRows = options?.deferTerminalDetailRows === true;
  const today = getTodayDateString();

  const detailStatuses = deferTerminalDetailRows
    ? APPROVALS_HUB_INITIAL_WORKFLOW_STATUSES
    : undefined;

  const [role, membership, queue, schedulingRows, statusIndex, canViewAll] =
    await Promise.all([
      getCurrentCampaignRole(),
      getActiveMembership(),
      getApprovalQueueOverviewForCurrentUser(undefined, {
        enrichPreviews: false,
      }),
      fetchCampaignBuilderSchedulingItems(detailStatuses),
      deferTerminalDetailRows
        ? fetchSchedulingStatusIndex()
        : Promise.resolve([] as SchedulingStatusIndexRow[]),
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

  const items = await mapSchedulingRowsToUnifiedItems({
    schedulingRows,
    classicItems,
    actor,
    leanEnrich,
  });

  const indexRows =
    statusIndex.length > 0
      ? statusIndex
      : schedulingRows.map((row) => ({
          id: row.id,
          event_id: row.event_id,
          campaign_name: row.campaign_name,
          workflow_status: row.workflow_status,
          delivery_method: row.delivery_method,
        }));

  const summaryFromIndex = summarizeStatusIndex(indexRows);
  const pulseCounts = computePulseCountsFromStatusIndex(indexRows);
  // Classic-only rows are not in the CB2 index — fold their counts in.
  const classicCounts = summarizeCounts(classicItems);
  const summary = {
    inQueue: summaryFromIndex.inQueue + classicCounts.in_queue,
    assignedToMe: summaryFromIndex.assignedToMe + classicCounts.assigned_to_me,
    scheduled: summaryFromIndex.scheduled + classicCounts.scheduled,
    posted: summaryFromIndex.posted + classicCounts.posted,
    published: summaryFromIndex.published + classicCounts.published,
    failed: summaryFromIndex.failed + classicCounts.failed,
    changesRequested:
      summaryFromIndex.changesRequested + classicCounts.changes_requested,
  };
  const mergedPulseCounts = {
    needs:
      pulseCounts.needs +
      classicCounts.in_queue +
      classicCounts.assigned_to_me,
    scheduled: pulseCounts.scheduled + classicCounts.scheduled,
    posted: pulseCounts.posted + classicCounts.posted + classicCounts.published,
    failed: pulseCounts.failed + classicCounts.failed,
    changes: pulseCounts.changes + classicCounts.changes_requested,
  };

  const campaigns = [
    ...new Map(
      [
        ...campaignsFromStatusIndex(indexRows),
        ...classicItems.map((item) => ({
          id: item.eventId,
          title: item.eventTitle,
        })),
      ].map((campaign) => [campaign.id, campaign]),
    ).values(),
  ].sort((left, right) => left.title.localeCompare(right.title));

  return {
    items,
    summary,
    pulseCounts: mergedPulseCounts,
    defersTerminalDetailRows: deferTerminalDetailRows,
    campaigns,
    actorEmail: actor?.email ?? null,
    actorUserId: actor?.organizationUserId ?? null,
    actorRoleId: actor?.organizationRoleId ?? null,
    role,
    canViewAll,
  };
}

/** Org Approvals hub — defers terminal detail rows to cut RSC payload. */
const resolveUnifiedApprovalsData = cache(
  async function resolveUnifiedApprovalsData(): Promise<UnifiedApprovalsPageData> {
    return buildUnifiedApprovalsPageData({ deferTerminalDetailRows: true });
  },
);

/** Dashboard widgets / complete lists — all statuses in `items`. */
const resolveUnifiedApprovalsDataLean = cache(
  async function resolveUnifiedApprovalsDataLean(): Promise<UnifiedApprovalsPageData> {
    return buildUnifiedApprovalsPageData({ leanEnrich: true });
  },
);

const resolveUnifiedApprovalsDataComplete = cache(
  async function resolveUnifiedApprovalsDataComplete(): Promise<UnifiedApprovalsPageData> {
    return buildUnifiedApprovalsPageData();
  },
);

export async function getUnifiedApprovalsSchedulingData(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsData();
}

/** Full status set in `items` (revision deep-links, complete exports). */
export async function getUnifiedApprovalsSchedulingDataComplete(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsDataComplete();
}

export async function getUnifiedApprovalsSchedulingDataLean(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsDataLean();
}

/**
 * Lazy-load deferred hub statuses (scheduled / posted / published) when the
 * user opens those pulses or searches across the full queue.
 */
export async function getUnifiedApprovalsDeferredPulseItems(
  statuses: readonly UnifiedWorkflowStatus[] = APPROVALS_HUB_DEFERRED_WORKFLOW_STATUSES,
): Promise<UnifiedApprovalItem[]> {
  const today = getTodayDateString();
  const [membership, schedulingRows] = await Promise.all([
    getActiveMembership(),
    fetchCampaignBuilderSchedulingItems(statuses),
  ]);
  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  return mapSchedulingRowsToUnifiedItems({
    schedulingRows,
    classicItems: [],
    actor,
    leanEnrich: false,
  });
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
    .order("requested_at", { ascending: false })
    .limit(SCHEDULING_EVENT_FETCH_CAP);

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

  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const row of schedulingRows) {
    if (row.event_id && row.campaign_name) {
      eventTitleById.set(row.event_id, row.campaign_name);
    }
  }

  const assigneeStarted = startTabTimer();
  const metaStarted = needsMetaPreview ? startTabTimer() : 0;
  const [assigneeLookups, bundlesByEvent, slotOutcomes, liveNames] =
    await Promise.all([
      loadAssigneeLookups(schedulingRows),
      needsMetaPreview
        ? loadMetaBundlesByEvent([eventId])
        : Promise.resolve(new Map<string, MetaPublishBundle[]>()),
      loadMetaSlotOutcomesForEvents([eventId]),
      loadLiveMilestoneNamesById([eventId]),
    ]);
  const assigneeEnrichmentMs = elapsedMs(assigneeStarted);
  let metaPreviewMs = 0;
  if (needsMetaPreview) {
    metaPreviewMs = elapsedMs(metaStarted);
    previewEnrichmentMs += metaPreviewMs;
  }
  const bundles = bundlesByEvent.get(eventId) ?? [];

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
      (row.event_id ? eventTitleById.get(row.event_id) : undefined) ??
        row.campaign_name ??
        "Campaign",
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

  const named = applyLiveMilestoneNames(
    dedupeUnifiedApprovalItems([...classicItems, ...cb2Items]),
    liveNames,
  );

  const withMeta = named
    .map((item) => applyMetaSlotOutcomesToApprovalItem(item, slotOutcomes))
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));

  const newsletterPreviews = await loadNewsletterApprovalPreviews(withMeta);
  const items = attachNewsletterPreviewsToItems(withMeta, newsletterPreviews);

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
      failed: counts.failed,
      changesRequested: counts.changes_requested,
    },
    pulseCounts: computeApprovalsEasePulseCounts(items),
    defersTerminalDetailRows: false,
    campaigns,
    actorEmail: actor?.email ?? null,
    actorUserId: actor?.organizationUserId ?? null,
    actorRoleId: actor?.organizationRoleId ?? null,
    role,
    canViewAll: await hasPermission("approve_comms"),
  };
}
