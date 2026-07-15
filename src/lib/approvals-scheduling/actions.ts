"use server";

import { revalidatePath } from "next/cache";
import {
  sendChangeRequestedEmail,
  sendContentApprovedEmail,
  sendCampaignManualUploadEmail,
  sendScheduledDeliveryEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import {
  previewWantsMetaFeedSchedule,
  resolveFeedScheduleIso,
  scheduleMetaFeedFromCampaignBuilderApproval,
} from "@/lib/campaign-builder-v2/schedule-meta-from-approval";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canApproveDraft } from "@/lib/auth/campaign-roles";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import {
  approveCommunicationAction,
  requestCommunicationChangesAction,
} from "@/lib/event-workspace/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/dates";
import {
  deliveryMethodPatchAfterManualKitSend,
  resolveRowManualEmailSendAt,
  resolveRowMetaScheduleIntent,
} from "@/lib/approvals-scheduling/approval-visibility";
import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";
import type { ApprovalSchedulingItemRow } from "@/lib/approvals-scheduling/types";

export type UnifiedApprovalActionResult = {
  success: boolean;
  error?: string;
  /** Non-fatal notice (e.g. Meta schedule failed after approval already saved). */
  warning?: string;
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

function resolveManualEmailSendAt(row: ApprovalSchedulingItemRow): string | null {
  return resolveRowManualEmailSendAt(row);
}

async function resolveMetaScheduleIntent(row: ApprovalSchedulingItemRow): Promise<{
  wantsMetaFeedSchedule: boolean;
  storyManual: boolean;
  feedScheduleAt: string | null;
}> {
  const session = await loadCampaignBuilderSession(row.event_id);
  const preview =
    session?.previewContents.find(
      (entry) => entry.milestoneId === row.campaign_milestone_id,
    ) ?? null;

  if (preview) {
    return {
      wantsMetaFeedSchedule: previewWantsMetaFeedSchedule(preview),
      storyManual:
        preview.enabledFormats.includes("instagram-story-manual") ||
        Boolean(preview.manualEmailTo.trim()) ||
        preview.deliveryMethod === "manual-email",
      feedScheduleAt: resolveFeedScheduleIso(preview) ?? row.schedule_at,
    };
  }

  return resolveRowMetaScheduleIntent(row);
}

async function resolveSchedulingCreatorEmail(
  schedulingItemId: string,
): Promise<string | null> {
  const row = await loadSchedulingItem(schedulingItemId);
  if (!row?.requested_by_user_id) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_users")
    .select("email")
    .eq("id", row.requested_by_user_id)
    .maybeSingle();

  return data?.email ?? null;
}

export async function approveUnifiedItemAction(input: {
  eventId: string;
  communicationItemId?: string | null;
  schedulingItemId?: string | null;
  campaignName?: string | null;
  milestoneName?: string | null;
  recipientEmail?: string | null;
}): Promise<UnifiedApprovalActionResult> {
  let metaWarning: string | undefined;

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
    if (!row) {
      return { success: false, error: "Scheduling item not found." };
    }

    const role = await getCurrentCampaignRole();
    if (
      !row.assigned_user_id &&
      !canApproveDraft(role) &&
      (row.workflow_status === "in_queue" ||
        row.workflow_status === "assigned_to_me")
    ) {
      return {
        success: false,
        error: "Assign an approver before approving this item.",
      };
    }

    const nextStatus: UnifiedWorkflowStatus =
      row.delivery_method === "draft-only" ? "published" : "scheduled";

    const updated = await updateSchedulingItemStatus(
      input.schedulingItemId,
      nextStatus,
    );

    if (!updated) {
      return { success: false, error: "Unable to update scheduling item." };
    }

    const creatorEmail =
      (await resolveSchedulingCreatorEmail(input.schedulingItemId)) ??
      input.recipientEmail ??
      null;

    const manualRecipient =
      row.manual_email_to?.trim() || creatorEmail || null;
    const isManualUploadKit =
      row.delivery_method === "manual-email" ||
      Boolean(row.manual_email_to?.trim());

    const metaIntent = await resolveMetaScheduleIntent(row);
    if (metaIntent.wantsMetaFeedSchedule) {
      const metaResult = await scheduleMetaFeedFromCampaignBuilderApproval({
        eventId: input.eventId,
        milestoneName: row.milestone_name,
        campaignMilestoneId: row.campaign_milestone_id,
        feedArtworkUrl: row.feed_artwork_url,
        storyArtworkUrl: row.story_artwork_url,
        captionText: row.caption_text,
        storyCaption: row.story_caption,
        feedScheduleAt: metaIntent.feedScheduleAt,
        wantsMetaFeedSchedule: true,
        storyManual: metaIntent.storyManual,
      });
      if (metaResult.error) {
        metaWarning = `Approved, but Meta feed scheduling failed: ${metaResult.error}`;
        console.error(
          "Meta feed schedule after CB2 approve failed:",
          metaResult.error,
        );
      }
    }

    if (input.campaignName && input.milestoneName) {
      if (creatorEmail) {
        await sendContentApprovedEmail({
          eventId: input.eventId,
          campaignName: input.campaignName,
          milestoneName: input.milestoneName,
          recipientEmail: creatorEmail,
          schedulingItemId: input.schedulingItemId,
        });
      }

      if (isManualUploadKit && manualRecipient) {
        const emailSendAt = resolveManualEmailSendAt(row);
        const scheduleAtMs = emailSendAt ? new Date(emailSendAt).getTime() : NaN;
        const dueNow =
          !emailSendAt ||
          Number.isNaN(scheduleAtMs) ||
          scheduleAtMs <= Date.now();
        // Resend allows scheduling up to 30 days ahead.
        const withinResendWindow =
          !dueNow &&
          scheduleAtMs - Date.now() <= 30 * 24 * 60 * 60 * 1000;

        if (dueNow || withinResendWindow) {
          const sendResult = await sendCampaignManualUploadEmail({
            eventId: input.eventId,
            campaignName: input.campaignName,
            milestoneName: input.milestoneName,
            recipientEmail: manualRecipient,
            scheduleLabel: emailSendAt
              ? formatDateTime(emailSendAt)
              : "Manual upload",
            schedulingItemId: input.schedulingItemId,
            storyArtworkUrl: row.story_artwork_url,
            storyCaption: row.story_caption,
            feedCaption: row.caption_text,
            uploadLink: row.manual_upload_link,
            scheduledAt: dueNow ? null : emailSendAt,
          });

          if (sendResult.success) {
            const supabase = await createClient();
            await supabase
              .from("approval_scheduling_items")
              .update({
                // Keep schedule/auto-publish when Meta feed was also scheduled.
                ...deliveryMethodPatchAfterManualKitSend(
                  metaIntent.wantsMetaFeedSchedule,
                ),
                manual_upload_email_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", input.schedulingItemId);
          } else {
            const emailWarning = `Approved, but manual upload email did not send: ${sendResult.message}`;
            metaWarning = metaWarning
              ? `${metaWarning} ${emailWarning}`
              : emailWarning;
            console.error(
              "Manual upload email after approve failed:",
              sendResult.message,
            );
          }
        }
        // Beyond 30 days → daily cron /api/cron/manual-upload-emails
      } else if (
        creatorEmail &&
        row.schedule_at &&
        nextStatus === "scheduled"
      ) {
        await sendScheduledDeliveryEmail({
          eventId: input.eventId,
          campaignName: input.campaignName,
          milestoneName: input.milestoneName,
          recipientEmail: creatorEmail,
          scheduleLabel: formatDateTime(row.schedule_at),
          schedulingItemId: input.schedulingItemId,
        });
      }
    }
  }

  revalidatePath("/approvals");
  return { success: true, warning: metaWarning };
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

  const creatorEmail =
    input.creatorEmail ??
    (input.schedulingItemId
      ? await resolveSchedulingCreatorEmail(input.schedulingItemId)
      : null);

  if (creatorEmail && input.campaignName && input.milestoneName) {
    await sendChangeRequestedEmail({
      eventId: input.eventId,
      campaignName: input.campaignName,
      milestoneName: input.milestoneName,
      recipientEmail: creatorEmail,
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
