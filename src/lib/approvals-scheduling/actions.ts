"use server";

import { revalidatePath } from "next/cache";
import {
  sendChangeRequestedEmail,
  sendContentApprovedEmail,
  sendScheduledDeliveryEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import {
  approveCommunicationAction,
  requestCommunicationChangesAction,
} from "@/lib/event-workspace/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/dates";
import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";

export type UnifiedApprovalActionResult = {
  success: boolean;
  error?: string;
};

async function updateSchedulingItemStatus(
  schedulingItemId: string,
  workflowStatus: UnifiedWorkflowStatus,
  notes?: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("approval_scheduling_items")
    .update({
      workflow_status: workflowStatus,
      notes: notes ?? null,
      resolved_at:
        workflowStatus === "published" ||
        workflowStatus === "scheduled" ||
        workflowStatus === "changes_requested"
          ? now
          : null,
      updated_at: now,
    })
    .eq("id", schedulingItemId);

  if (error?.code === "42P01") {
    return false;
  }

  return !error;
}

async function loadSchedulingItem(schedulingItemId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("id", schedulingItemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function approveUnifiedItemAction(input: {
  eventId: string;
  communicationItemId?: string | null;
  schedulingItemId?: string | null;
  campaignName?: string | null;
  milestoneName?: string | null;
  recipientEmail?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  if (input.communicationItemId) {
    const result = await approveCommunicationAction(
      input.eventId,
      input.communicationItemId,
    );
    if (!result.success) {
      return { success: false, error: result.error ?? "Unable to approve." };
    }
  }

  if (input.schedulingItemId) {
    const row = await loadSchedulingItem(input.schedulingItemId);
    const nextStatus: UnifiedWorkflowStatus =
      row?.delivery_method === "draft-only" ? "published" : "scheduled";

    const updated = await updateSchedulingItemStatus(
      input.schedulingItemId,
      nextStatus,
    );

    if (!updated) {
      return { success: false, error: "Unable to update scheduling item." };
    }

    if (input.recipientEmail && input.campaignName && input.milestoneName) {
      await sendContentApprovedEmail({
        eventId: input.eventId,
        campaignName: input.campaignName,
        milestoneName: input.milestoneName,
        recipientEmail: input.recipientEmail,
        schedulingItemId: input.schedulingItemId,
      });

      if (row?.schedule_at && nextStatus === "scheduled") {
        await sendScheduledDeliveryEmail({
          eventId: input.eventId,
          campaignName: input.campaignName,
          milestoneName: input.milestoneName,
          recipientEmail: input.recipientEmail,
          scheduleLabel: formatDateTime(row.schedule_at),
          schedulingItemId: input.schedulingItemId,
        });
      }
    }
  }

  revalidatePath("/approvals");
  return { success: true };
}

export async function requestUnifiedChangesAction(input: {
  eventId: string;
  communicationItemId?: string | null;
  schedulingItemId?: string | null;
  comment: string;
  creatorEmail?: string | null;
  campaignName?: string | null;
  milestoneName?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  const comment = input.comment.trim();
  if (!comment) {
    return { success: false, error: "A comment is required when requesting changes." };
  }

  if (input.communicationItemId) {
    const result = await requestCommunicationChangesAction(
      input.eventId,
      input.communicationItemId,
      comment,
    );
    if (!result.success) {
      return { success: false, error: result.error ?? "Unable to request changes." };
    }
  }

  if (input.schedulingItemId) {
    const updated = await updateSchedulingItemStatus(
      input.schedulingItemId,
      "changes_requested",
      comment,
    );
    if (!updated) {
      return { success: false, error: "Unable to update scheduling item." };
    }
  }

  if (input.creatorEmail && input.campaignName && input.milestoneName) {
    await sendChangeRequestedEmail({
      eventId: input.eventId,
      campaignName: input.campaignName,
      milestoneName: input.milestoneName,
      recipientEmail: input.creatorEmail,
      comment,
      schedulingItemId: input.schedulingItemId ?? null,
    });
  }

  revalidatePath("/approvals");
  return { success: true };
}

export async function reassignUnifiedItemAction(input: {
  schedulingItemId: string;
  assignedUserId: string;
}): Promise<UnifiedApprovalActionResult> {
  const role = await getCurrentCampaignRole();
  if (role !== "admin" && role !== "president" && role !== "vp_communications") {
    return { success: false, error: "Only admins can reassign approvals." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("approval_scheduling_items")
    .update({
      assigned_user_id: input.assignedUserId,
      workflow_status: "assigned_to_me",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.schedulingItemId);

  if (error) {
    return { success: false, error: "Unable to reassign item." };
  }

  revalidatePath("/approvals");
  return { success: true };
}

export async function getReassignableUsersAction(): Promise<
  Array<{ id: string; email: string; roleName: string | null }>
> {
  const { getCurrentOrganization } = await import("@/lib/auth/organization-context");
  const organization = await getCurrentOrganization();
  if (!organization) {
    return [];
  }

  const users = await getOrganizationUsers(organization.id);
  return users
    .filter((user) => user.status === "active")
    .map((user) => ({
      id: user.id,
      email: user.email,
      roleName: user.organizationRoleName,
    }));
}
