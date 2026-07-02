import { getActiveMembership } from "@/lib/auth/membership-queries";
import {
  type ApprovalActor,
} from "@/lib/event-workspace/approval-permissions";
import { createClient } from "@/lib/supabase/server";
import type {
  ApprovalQueueItem,
  ApprovalRequestRow,
  CommunicationChannel,
  CommunicationStatus,
} from "@/types/event-workspace";

type ApprovalQueueRow = ApprovalRequestRow & {
  events: { id: string; title: string } | null;
  communication_items: {
    id: string;
    channel: CommunicationChannel;
    status: CommunicationStatus;
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
  if (!actor) {
    return false;
  }

  if (row.assigned_user_id && actor.organizationUserId === row.assigned_user_id) {
    return true;
  }

  if (
    row.assigned_organization_role_id &&
    actor.organizationRoleId === row.assigned_organization_role_id
  ) {
    return true;
  }

  return false;
}

function mapQueueRow(
  row: ApprovalQueueRow,
  actor: ApprovalActor | null,
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
    assigneeDisplayName: resolveAssigneeDisplayName(row),
    assignedToMe: isAssignedToActor(row, actor),
    notes: row.notes,
  };
}

async function fetchApprovalQueueRows(): Promise<ApprovalQueueRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approval_requests")
    .select(
      `
      *,
      events ( id, title ),
      communication_items ( id, channel, status ),
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

  if (error?.code === "42P01") {
    return [];
  }

  if (error) {
    console.error("Failed to fetch approval queue:", error.message);
    return [];
  }

  return (data ?? []) as ApprovalQueueRow[];
}

export async function getApprovalQueueForCurrentUser(): Promise<{
  assignedToMe: ApprovalQueueItem[];
  allPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
  actor: ApprovalActor | null;
}> {
  const [membership, rows] = await Promise.all([
    getActiveMembership(),
    fetchApprovalQueueRows(),
  ]);

  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
      }
    : null;

  const mapped = rows
    .map((row) => mapQueueRow(row, actor))
    .filter((item): item is ApprovalQueueItem => item !== null);

  const pending = mapped.filter((item) => item.status === "pending");
  const assignedToMe = pending.filter((item) => item.assignedToMe);

  return {
    assignedToMe,
    allPending: pending,
    changesRequested: mapped.filter(
      (item) => item.communicationStatus === "changes_requested",
    ),
    recentlyApproved: mapped
      .filter((item) => item.status === "approved")
      .slice(0, 10),
    actor,
  };
}
