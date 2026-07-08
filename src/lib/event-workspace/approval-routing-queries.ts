import { displayDraftContent } from "@/lib/ai/content";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { isActorAssignedToApproval } from "@/lib/event-workspace/approval-actor-matching";
import {
  dedupePendingApprovalQueueRows,
  resolveStalePendingApprovalRequestsForApprovedItems,
} from "@/lib/event-workspace/approval-request-dedupe";
import { isCommunicationApprovable } from "@/lib/event-workspace/approval-workflow";
import { backfillMetaApprovalRequests } from "@/lib/event-workspace/meta-approval-sync";
import {
  type ApprovalActor,
} from "@/lib/event-workspace/approval-permissions";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type {
  ApprovalQueueItem,
  ApprovalQueuePreview,
  ApprovalRequestRow,
  CommunicationChannel,
  CommunicationStatus,
} from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";

type ApprovalQueueRow = ApprovalRequestRow & {
  events: { id: string; title: string } | null;
  communication_items: {
    id: string;
    channel: CommunicationChannel;
    status: CommunicationStatus;
    event_communication_step_id: string | null;
  } | null;
  assigned_role: {
    name: string | null;
    contact_name: string | null;
  } | null;
  assigned_user: {
    email: string | null;
    organization_roles: { name: string | null } | null;
  } | null;
};

function resolveAssigneeDisplayName(row: ApprovalQueueRow): string {
  if (row.assigned_role?.contact_name?.trim()) {
    return row.assigned_role.contact_name.trim();
  }

  if (row.assigned_user?.email) {
    return row.assigned_user.email;
  }

  if (row.assigned_role?.name) {
    return row.assigned_role.name;
  }

  if (row.assigned_user?.organization_roles?.name) {
    return row.assigned_user.organization_roles.name;
  }

  return "Board";
}

function isAssignedToActor(
  row: ApprovalQueueRow,
  actor: ApprovalActor | null,
): boolean {
  return isActorAssignedToApproval(actor, {
    assignedOrganizationRoleId: row.assigned_organization_role_id ?? null,
    assignedUserId: row.assigned_user_id ?? null,
    assignedRoleContactName: row.assigned_role?.contact_name ?? null,
  });
}

const EMPTY_PREVIEW: ApprovalQueuePreview = {
  milestoneTitle: null,
  scheduledFor: null,
  captionText: null,
  storyCaptionSnippet: null,
  artworkThumbnailUrl: null,
};

function mapQueueRow(
  row: ApprovalQueueRow,
  actor: ApprovalActor | null,
  preview: ApprovalQueuePreview = EMPTY_PREVIEW,
): ApprovalQueueItem | null {
  if (!row.communication_items || !row.events) {
    return null;
  }

  return {
    id: row.id,
    eventId: row.events.id,
    eventTitle: row.events.title,
    communicationItemId: row.communication_items.id,
    channel: row.communication_items.channel,
    status: row.status,
    communicationStatus: row.communication_items.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    assigneeDisplayName: resolveAssigneeDisplayName(row),
    assignedToMe: isAssignedToActor(row, actor),
    submittedByMe: Boolean(
      actor?.organizationUserId &&
        row.requested_by_user_id === actor.organizationUserId,
    ),
    notes: row.notes,
    preview,
  };
}

async function fetchApprovalQueueRows(eventId?: string): Promise<ApprovalQueueRow[]> {
  const { getOrganizationSchoolYearIds, resolveScopedOrganizationId } =
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
  const { data: scopedEvents, error: scopeError } = await supabase
    .from("events")
    .select("id")
    .in("school_year_id", schoolYearIds);

  if (scopeError) {
    console.error("Failed to scope approval queue events:", scopeError.message);
    return [];
  }

  const eventIds = (scopedEvents ?? []).map((row) => row.id as string);
  if (eventIds.length === 0) {
    return [];
  }

  if (eventId && !eventIds.includes(eventId)) {
    return [];
  }

  let approvalQuery = supabase
    .from("approval_requests")
    .select(
      `
      *,
      events ( id, title ),
      communication_items ( id, channel, status, event_communication_step_id ),
      assigned_role:organization_roles!approval_requests_assigned_organization_role_id_fkey (
        name,
        contact_name
      ),
      assigned_user:organization_users!approval_requests_assigned_user_id_fkey (
        email,
        organization_roles ( name )
      )
    `,
    )
    .order("requested_at", { ascending: false });

  approvalQuery = eventId
    ? approvalQuery.eq("event_id", eventId)
    : approvalQuery.in("event_id", eventIds);

  const { data, error } = await approvalQuery;

  if (error?.code === "42P01") {
    return [];
  }

  if (error) {
    console.error("Failed to fetch approval queue:", error.message);
    return [];
  }

  return (data ?? []) as ApprovalQueueRow[];
}

async function fetchVersionContentById(
  versionIds: string[],
): Promise<Map<string, string>> {
  if (versionIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_versions")
    .select("id, content")
    .in("id", versionIds);

  if (error?.code === "42P01" || error) {
    if (error && error.code !== "42P01") {
      console.error("Failed to fetch approval preview versions:", error.message);
    }
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [row.id as string, row.content as string]),
  );
}

async function fetchStepsById(
  stepIds: string[],
): Promise<Map<string, EventCommunicationStepRow>> {
  if (stepIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_communication_steps")
    .select("id, relative_day, due_date, title, channel, status, sort_order, event_id")
    .in("id", stepIds);

  if (error?.code === "42P01" || error) {
    if (error && error.code !== "42P01") {
      console.error("Failed to fetch approval preview steps:", error.message);
    }
    return new Map();
  }

  return new Map(
    ((data ?? []) as EventCommunicationStepRow[]).map((row) => [row.id, row]),
  );
}

function findBundleForRow(
  bundles: MetaPublishBundle[],
  stepId: string | null,
): MetaPublishBundle | null {
  if (!stepId) {
    return null;
  }

  return bundles.find((bundle) => bundle.stepId === stepId) ?? null;
}

function buildPreviewForRow(
  row: ApprovalQueueRow,
  versionContentById: Map<string, string>,
  stepsById: Map<string, EventCommunicationStepRow>,
  bundlesByEvent: Map<string, MetaPublishBundle[]>,
): ApprovalQueuePreview {
  const stepId = row.communication_items?.event_communication_step_id ?? null;
  const step = stepId ? stepsById.get(stepId) ?? null : null;
  const bundles = bundlesByEvent.get(row.events?.id ?? "") ?? [];
  const bundle = findBundleForRow(bundles, stepId);

  const versionContent = row.communication_version_id
    ? versionContentById.get(row.communication_version_id) ?? null
    : null;

  const captionText = displayDraftContent(
    versionContent ?? bundle?.captionPreview ?? null,
  );

  const scheduledFor =
    bundle?.scheduledFor ??
    (step?.due_date ? `${String(step.due_date).slice(0, 10)}T10:00:00.000Z` : null);

  return {
    milestoneTitle: step?.title ?? bundle?.title ?? null,
    scheduledFor,
    captionText,
    storyCaptionSnippet: bundle?.storyCaptionPreview ?? null,
    artworkThumbnailUrl: bundle?.feedArtworkUrl ?? null,
  };
}

async function enrichApprovalQueuePreviews(
  rows: ApprovalQueueRow[],
  items: ApprovalQueueItem[],
): Promise<ApprovalQueueItem[]> {
  if (items.length === 0) {
    return items;
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const versionIds = [
    ...new Set(
      rows
        .map((row) => row.communication_version_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const stepIds = [
    ...new Set(
      rows
        .map((row) => row.communication_items?.event_communication_step_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const eventIds = [...new Set(items.map((item) => item.eventId))];

  const [versionContentById, stepsById, bundleLists] = await Promise.all([
    fetchVersionContentById(versionIds),
    fetchStepsById(stepIds),
    Promise.all(eventIds.map(async (eventId) => getMetaPublishBundles(eventId))),
  ]);

  const bundlesByEvent = new Map(
    eventIds.map((eventId, index) => [eventId, bundleLists[index] ?? []]),
  );

  return items.map((item) => {
    const row = rowById.get(item.id);
    if (!row) {
      return item;
    }

    return {
      ...item,
      preview: buildPreviewForRow(row, versionContentById, stepsById, bundlesByEvent),
    };
  });
}

const resolveApprovalQueueBase = cache(async function resolveApprovalQueueBase(
  eventId?: string,
): Promise<{
  actor: ApprovalActor | null;
  rows: ApprovalQueueRow[];
  items: ApprovalQueueItem[];
}> {
  const [membership, rows] = await Promise.all([
    getActiveMembership(),
    fetchApprovalQueueRows(eventId),
  ]);

  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  if (actor) {
    const synced = await backfillMetaApprovalRequests(actor);
    if (synced > 0) {
      console.info(
        `Backfilled ${synced} meta milestone approval request(s) for approvals inbox.`,
      );
    }
  } else {
    await resolveStalePendingApprovalRequestsForApprovedItems();
  }

  const refreshedRows = dedupePendingApprovalQueueRows(
    actor ? await fetchApprovalQueueRows(eventId) : rows,
  );
  const items = refreshedRows
    .map((row) => mapQueueRow(row, actor))
    .filter((item): item is ApprovalQueueItem => item !== null);

  return { actor, rows: refreshedRows, items };
});

function filterPendingAssignedToMe(items: ApprovalQueueItem[]): ApprovalQueueItem[] {
  return items.filter(
    (item) =>
      item.status === "pending" &&
      isCommunicationApprovable(item.communicationStatus) &&
      item.assignedToMe,
  );
}

function filterChangeRequestsForSubmitter(
  items: ApprovalQueueItem[],
): ApprovalQueueItem[] {
  return items.filter(
    (item) =>
      item.communicationStatus === "changes_requested" && item.submittedByMe,
  );
}

export async function getAssignedApprovalsCountForCurrentUser(): Promise<number> {
  const { items } = await resolveApprovalQueueBase();
  return filterPendingAssignedToMe(items).length;
}

export async function getChangeRequestsCountForCurrentUser(): Promise<number> {
  const { items } = await resolveApprovalQueueBase();
  return filterChangeRequestsForSubmitter(items).length;
}

export async function getApprovalSidebarCountsForCurrentUser(): Promise<{
  assignedApprovalsCount: number;
  changeRequestsCount: number;
}> {
  const { items } = await resolveApprovalQueueBase();
  return {
    assignedApprovalsCount: filterPendingAssignedToMe(items).length,
    changeRequestsCount: filterChangeRequestsForSubmitter(items).length,
  };
}

export async function getApprovalQueueForCurrentUser(): Promise<{
  assignedToMe: ApprovalQueueItem[];
  allPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
  actor: ApprovalActor | null;
}> {
  const overview = await getApprovalQueueOverviewForCurrentUser();
  return {
    ...overview,
    recentlyApproved: overview.recentlyApproved.slice(0, 10),
  };
}

export async function getApprovalQueueOverviewForCurrentUser(
  eventId?: string,
): Promise<{
  assignedToMe: ApprovalQueueItem[];
  allPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
  actor: ApprovalActor | null;
}> {
  const { actor, rows, items } = await resolveApprovalQueueBase(eventId);
  const enriched = await enrichApprovalQueuePreviews(rows, items);

  const pending = enriched.filter(
    (item) =>
      item.status === "pending" &&
      isCommunicationApprovable(item.communicationStatus),
  );
  const assignedToMe = pending.filter((item) => item.assignedToMe);

  return {
    assignedToMe,
    allPending: pending,
    changesRequested: enriched.filter(
      (item) => item.communicationStatus === "changes_requested",
    ),
    recentlyApproved: enriched.filter((item) => item.status === "approved"),
    actor,
  };
}
