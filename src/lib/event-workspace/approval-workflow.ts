import { channelLabel } from "@/lib/ai/content";
import {
  canSubmitForApproval,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { getEventById } from "@/lib/events/queries";
import {
  canActOnAssignedApproval,
  type ApprovalActor,
} from "@/lib/event-workspace/approval-permissions";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { createClient } from "@/lib/supabase/server";
import type { CommunicationChannel, CommunicationStatus } from "@/types/event-workspace";

export type ApprovalWorkflowResult = {
  success: boolean;
  error?: string;
};

type LatestVersion = {
  id: string;
  version_number: number;
};

type CommunicationItemRow = {
  id: string;
  event_id: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
};

async function getLatestVersion(
  communicationItemId: string,
): Promise<LatestVersion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_versions")
    .select("id, version_number")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getCommunicationItem(
  communicationItemId: string,
  eventId: string,
): Promise<CommunicationItemRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_items")
    .select("id, event_id, channel, status")
    .eq("id", communicationItemId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CommunicationItemRow;
}

async function logApprovalActivity(
  eventId: string,
  title: string,
  description: string,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase.from("activity_log").insert({
    event_id: eventId,
    activity_type: "board_approval",
    title,
    description,
    occurred_at: now,
  });
}

async function upsertPendingApprovalRequest(input: {
  eventId: string;
  communicationItemId: string;
  versionId: string;
  notes?: string | null;
  assignedOrganizationRoleId?: string | null;
  assignedUserId?: string | null;
  requestedByUserId?: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const assigneeFields = {
    assigned_organization_role_id: input.assignedOrganizationRoleId ?? null,
    assigned_user_id: input.assignedUserId ?? null,
    requested_by_user_id: input.requestedByUserId ?? null,
  };

  const { data: existing } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("communication_item_id", input.communicationItemId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "pending",
        communication_version_id: input.versionId,
        requested_at: now,
        resolved_at: null,
        notes: input.notes ?? null,
        ...assigneeFields,
      })
      .eq("id", existing.id);

    return !error;
  }

  const { error } = await supabase.from("approval_requests").insert({
    event_id: input.eventId,
    communication_item_id: input.communicationItemId,
    communication_version_id: input.versionId,
    status: "pending",
    notes: input.notes ?? null,
    ...assigneeFields,
  });

  return !error;
}

async function resolveApprovalRequest(input: {
  communicationItemId: string;
  versionId: string;
  status: "approved" | "rejected";
  notes?: string | null;
}): Promise<{ ok: boolean; staleVersion?: boolean }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: pendingRequest } = await supabase
    .from("approval_requests")
    .select("id, communication_version_id")
    .eq("communication_item_id", input.communicationItemId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    pendingRequest?.communication_version_id &&
    pendingRequest.communication_version_id !== input.versionId
  ) {
    return { ok: false, staleVersion: true };
  }

  if (pendingRequest) {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: input.status,
        communication_version_id: input.versionId,
        resolved_at: now,
        notes: input.notes ?? null,
      })
      .eq("id", pendingRequest.id);

    return { ok: !error };
  }

  const { data: item } = await supabase
    .from("communication_items")
    .select("event_id")
    .eq("id", input.communicationItemId)
    .maybeSingle();

  if (!item) {
    return { ok: false };
  }

  const { error } = await supabase.from("approval_requests").insert({
    event_id: item.event_id,
    communication_item_id: input.communicationItemId,
    communication_version_id: input.versionId,
    status: input.status,
    requested_at: now,
    resolved_at: now,
    notes: input.notes ?? null,
  });

  return { ok: !error };
}

const SUBMITTABLE_STATUSES = new Set<CommunicationStatus>([
  "generated",
  "changes_requested",
]);

export async function sendCommunicationForApproval(
  eventId: string,
  communicationItemId: string,
  role: CampaignRole,
  actor?: ApprovalActor | null,
): Promise<ApprovalWorkflowResult> {
  if (!canSubmitForApproval(role)) {
    return {
      success: false,
      error: "You do not have permission to send drafts for approval.",
    };
  }

  const item = await getCommunicationItem(communicationItemId, eventId);
  if (!item) {
    return { success: false, error: "Communication not found." };
  }

  if (!SUBMITTABLE_STATUSES.has(item.status)) {
    return {
      success: false,
      error: "Only ready drafts can be sent for approval.",
    };
  }

  const version = await getLatestVersion(communicationItemId);
  if (!version) {
    return { success: false, error: "Draft a message before sending for approval." };
  }

  const organization = await getCurrentOrganization();
  const event = await getEventById(eventId);
  const assignee = organization
    ? await resolveApprovalAssignee(
        organization.id,
        event?.approvalOrganizationRoleId ?? null,
      )
    : {
        organizationRoleId: null,
        organizationRoleName: null,
        assignedUserId: null,
        assigneeDisplayName: "Board",
      };

  const saved = await upsertPendingApprovalRequest({
    eventId,
    communicationItemId,
    versionId: version.id,
    assignedOrganizationRoleId: assignee.organizationRoleId,
    assignedUserId: assignee.assignedUserId,
    requestedByUserId: actor?.organizationUserId ?? null,
  });

  if (!saved) {
    return { success: false, error: "Unable to create approval request." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error: itemError } = await supabase
    .from("communication_items")
    .update({
      status: "pending_approval",
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId);

  if (itemError) {
    return { success: false, error: "Unable to update draft status." };
  }

  const label = channelLabel(item.channel);
  const approverLabel =
    assignee.assigneeDisplayName === "Board"
      ? "board review"
      : assignee.assigneeDisplayName;

  await logApprovalActivity(
    eventId,
    "Draft sent for approval",
    `${label} is waiting on ${approverLabel}.`,
  );

  return { success: true };
}

async function getPendingApprovalAssignment(
  communicationItemId: string,
): Promise<{
  assignedOrganizationRoleId: string | null;
  assignedUserId: string | null;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("approval_requests")
    .select("assigned_organization_role_id, assigned_user_id")
    .eq("communication_item_id", communicationItemId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    assignedOrganizationRoleId: data.assigned_organization_role_id ?? null,
    assignedUserId: data.assigned_user_id ?? null,
  };
}

export async function approveCommunicationDraft(
  eventId: string,
  communicationItemId: string,
  role: CampaignRole,
  actor?: ApprovalActor | null,
): Promise<ApprovalWorkflowResult> {
  const assignment = await getPendingApprovalAssignment(communicationItemId);

  if (!canActOnAssignedApproval(role, actor ?? null, assignment)) {
    return {
      success: false,
      error: "You are not the assigned approver for this draft.",
    };
  }

  const item = await getCommunicationItem(communicationItemId, eventId);
  if (!item) {
    return { success: false, error: "Communication not found." };
  }

  const approvableStatuses = new Set<CommunicationStatus>([
    "generated",
    "pending_approval",
  ]);

  if (!approvableStatuses.has(item.status)) {
    return { success: false, error: "This draft is not ready to approve." };
  }

  const version = await getLatestVersion(communicationItemId);
  if (!version) {
    return { success: false, error: "No draft version found to approve." };
  }

  const resolved = await resolveApprovalRequest({
    communicationItemId,
    versionId: version.id,
    status: "approved",
  });

  if (resolved.staleVersion) {
    return {
      success: false,
      error:
        "This draft was updated after it was sent for approval. Ask for the latest version to be submitted again.",
    };
  }

  if (!resolved.ok) {
    return { success: false, error: "Unable to record approval." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error: itemError } = await supabase
    .from("communication_items")
    .update({
      status: "approved",
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId);

  if (itemError) {
    return { success: false, error: "Unable to mark draft as approved." };
  }

  const label = channelLabel(item.channel);
  await logApprovalActivity(
    eventId,
    "Draft approved",
    `${label} is approved and ready to publish.`,
  );

  return { success: true };
}

export async function requestCommunicationChanges(
  eventId: string,
  communicationItemId: string,
  role: CampaignRole,
  notes?: string | null,
  actor?: ApprovalActor | null,
): Promise<ApprovalWorkflowResult> {
  const assignment = await getPendingApprovalAssignment(communicationItemId);

  if (!canActOnAssignedApproval(role, actor ?? null, assignment)) {
    return {
      success: false,
      error: "You are not the assigned approver for this draft.",
    };
  }

  const item = await getCommunicationItem(communicationItemId, eventId);
  if (!item) {
    return { success: false, error: "Communication not found." };
  }

  if (item.status !== "pending_approval") {
    return {
      success: false,
      error: "Only drafts waiting on approval can be sent back.",
    };
  }

  const version = await getLatestVersion(communicationItemId);
  if (!version) {
    return { success: false, error: "No draft version found." };
  }

  const resolved = await resolveApprovalRequest({
    communicationItemId,
    versionId: version.id,
    status: "rejected",
    notes: notes?.trim() || "Changes requested before approval.",
  });

  if (resolved.staleVersion) {
    return {
      success: false,
      error:
        "This draft was updated after it was sent for approval. Ask for the latest version to be submitted again.",
    };
  }

  if (!resolved.ok) {
    return { success: false, error: "Unable to record change request." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error: itemError } = await supabase
    .from("communication_items")
    .update({
      status: "changes_requested",
      last_updated: now,
      updated_at: now,
    })
    .eq("id", communicationItemId);

  if (itemError) {
    return { success: false, error: "Unable to update draft status." };
  }

  const label = channelLabel(item.channel);
  const detail = notes?.trim()
    ? `${label}: ${notes.trim()}`
    : `${label} needs edits before approval.`;

  await logApprovalActivity(eventId, "Changes requested", detail);

  return { success: true };
}
