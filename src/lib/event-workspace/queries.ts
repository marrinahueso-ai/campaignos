import { createClient } from "@/lib/supabase/server";
import { displayDraftContent } from "@/lib/ai/content";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { getHubCommunicationItems } from "@/lib/event-workspace/communication-items";
import {
  mapActivityLogRows,
  mapApprovalRequestRow,
  mapCommunicationItemRow,
  mapEventAssetRows,
  mapLatestContentByItemId,
  mapPublicationScheduleRow,
} from "@/lib/event-workspace/mappers";
import type {
  ActivityLogRow,
  ApprovalRequestRow,
  CommunicationItemRow,
  CommunicationVersionRow,
  EventAssetRow,
  EventWorkspaceData,
  PublicationScheduleRow,
} from "@/types/event-workspace";

type ApprovalRequestWithRelations = ApprovalRequestRow & {
  assigned_role: { name: string | null; contact_name: string | null } | null;
  assigned_user: {
    email: string | null;
    organization_roles: { name: string | null } | null;
  } | null;
};

function resolveAssigneeDisplayName(
  row: ApprovalRequestWithRelations,
  fallbackName: string | null,
): string | null {
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

  if (row.assigned_organization_role_id || row.assigned_user_id) {
    return "Board";
  }

  return fallbackName;
}

async function mapApprovalRequestRows(
  rows: ApprovalRequestRow[],
): Promise<ReturnType<typeof mapApprovalRequestRow>[]> {
  if (rows.length === 0) {
    return [];
  }

  const organization = await getCurrentOrganization();
  const fallbackAssignee = organization
    ? await resolveApprovalAssignee(organization.id)
    : null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("approval_requests")
    .select(
      `
      *,
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
    .in(
      "id",
      rows.map((row) => row.id),
    );

  const relationById = new Map(
    ((data ?? []) as ApprovalRequestWithRelations[]).map((row) => [row.id, row]),
  );

  return rows.map((row) => {
    const enriched = relationById.get(row.id);
    const assigneeDisplayName = enriched
      ? resolveAssigneeDisplayName(
          enriched,
          fallbackAssignee?.assigneeDisplayName ?? null,
        )
      : fallbackAssignee?.assigneeDisplayName ?? null;

    return mapApprovalRequestRow(row, assigneeDisplayName);
  });
}

async function getLatestContentMap(
  itemIds: string[],
): Promise<Map<string, string>> {
  if (itemIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_versions")
    .select("*")
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  if (error || !data) {
    return new Map();
  }

  return mapLatestContentByItemId(data as CommunicationVersionRow[]);
}

/** Exact-event activity_log only — Event Detail Activity tab. */
export async function getEventActivityLogForEvent(
  eventId: string,
): Promise<import("@/types/event-workspace").ActivityLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("event_id", eventId)
    .order("occurred_at", { ascending: false })
    .limit(40);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to fetch event activity log:", error.message);
    return [];
  }

  return mapActivityLogRows((data ?? []) as ActivityLogRow[]);
}

export async function getEventWorkspaceData(
  eventId: string,
): Promise<EventWorkspaceData | null> {
  const supabase = await createClient();

  const [
    assetsResult,
    communicationsResult,
    timelineResult,
    approvalsResult,
    scheduleResult,
  ] = await Promise.all([
    supabase.from("event_assets").select("*").eq("event_id", eventId),
    supabase.from("communication_items").select("*").eq("event_id", eventId),
    supabase
      .from("activity_log")
      .select("*")
      .eq("event_id", eventId)
      .order("occurred_at", { ascending: true }),
    supabase
      .from("approval_requests")
      .select("*")
      .eq("event_id", eventId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("publication_schedule")
      .select("*")
      .eq("event_id", eventId)
      .order("scheduled_for", { ascending: true }),
  ]);

  if (
    assetsResult.error?.code === "42P01" ||
    communicationsResult.error?.code === "42P01"
  ) {
    return null;
  }

  const communicationRows = getHubCommunicationItems(
    (communicationsResult.data ?? []) as CommunicationItemRow[],
  );
  const contentMap = await getLatestContentMap(communicationRows.map((row) => row.id));

  return {
    assets: mapEventAssetRows((assetsResult.data ?? []) as EventAssetRow[]),
    communications: communicationRows.map((row) =>
      mapCommunicationItemRow(
        row,
        displayDraftContent(contentMap.get(row.id) ?? null),
      ),
    ),
    timeline: mapActivityLogRows((timelineResult.data ?? []) as ActivityLogRow[]),
    approvalRequests: await mapApprovalRequestRows(
      (approvalsResult.data ?? []) as ApprovalRequestRow[],
    ),
    publicationSchedule: (
      (scheduleResult.data ?? []) as PublicationScheduleRow[]
    ).map(mapPublicationScheduleRow),
  };
}

export async function isEventWorkspaceInitialized(
  eventId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("communication_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}