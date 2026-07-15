import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  sendApprovalAssignedEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { getSharedCaptionText } from "@/lib/campaign-builder-v2/caption-utils";
import { normalizeMilestoneName } from "@/lib/campaign-builder-v2/milestone-names";
import {
  derivedPreviewStatus,
  milestoneHasArtwork,
} from "@/lib/campaign-builder-v2/milestone-status";
import { loadCampaignBuilderSessionAction } from "@/lib/campaign-builder-v2/session";
import type {
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";
import { buildManualEmailPersistenceFields } from "@/lib/campaign-builder-v2/manual-email-scheduling";
import { combineLocalDateAndTimeToIso } from "@/lib/utils/dates";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";

export interface SendCampaignBuilderForApprovalInput {
  eventId: string;
  campaignName: string;
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
}

export interface SendCampaignBuilderForApprovalResult {
  success: boolean;
  message: string;
  createdCount: number;
}

/** Meta / publish schedule_at — unchanged from pre–Manual Email Commit 4 behavior. */
function resolveScheduleIso(preview: MilestonePreviewContent): string | null {
  if (preview.deliveryMethod === "manual-email") {
    return combineLocalDateAndTimeToIso(
      preview.emailSendDate,
      preview.emailSendTime,
    );
  }

  return combineLocalDateAndTimeToIso(
    preview.scheduleDate,
    preview.scheduleTime,
  );
}

export async function sendCampaignBuilderForApproval(
  input: SendCampaignBuilderForApprovalInput,
): Promise<SendCampaignBuilderForApprovalResult> {
  const role = await getCurrentCampaignRole();
  const membership = await getActiveMembership();
  const organization = await getCurrentOrganization();
  const event = await getEventById(input.eventId);

  if (!organization || !event) {
    return {
      success: false,
      message: "Organization or campaign not found.",
      createdCount: 0,
    };
  }

  const assignee = await resolveApprovalAssignee(
    organization.id,
    event.approvalOrganizationRoleId ?? null,
  );

  const previewByMilestone = new Map(
    input.previewContents.map((preview) => [preview.milestoneId, preview]),
  );

  const milestonesToSubmit = input.milestones.filter((milestone) => {
    const preview = previewByMilestone.get(milestone.id);
    // Artwork is required for Approvals review — caption-only rows looked empty.
    return Boolean(preview) && milestoneHasArtwork(preview!);
  });

  const skippedWithoutArtwork = input.milestones
    .filter((milestone) => {
      const preview = previewByMilestone.get(milestone.id);
      return (
        Boolean(preview) &&
        derivedPreviewStatus(preview!) !== "draft" &&
        !milestoneHasArtwork(preview!)
      );
    })
    .map((milestone) => normalizeMilestoneName(milestone.name));

  if (milestonesToSubmit.length === 0) {
    return {
      success: false,
      message:
        skippedWithoutArtwork.length > 0
          ? `Generate artwork before sending for approval. Missing artwork: ${skippedWithoutArtwork.join(", ")}.`
          : "Generate artwork for at least one milestone before sending for approval.",
      createdCount: 0,
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  let createdCount = 0;
  const orgUsers = await getOrganizationUsers(organization.id);
  const recipientEmail = assignee.assignedUserId
    ? orgUsers.find((member) => member.id === assignee.assignedUserId)?.email ?? null
    : null;

  for (const milestone of milestonesToSubmit) {
    const preview = previewByMilestone.get(milestone.id);
    if (!preview) {
      continue;
    }

    const captionText = getSharedCaptionText(preview.captions);
    const scheduleAt = resolveScheduleIso(preview);
    const manualEmailFields = buildManualEmailPersistenceFields(preview);
    const workflowStatus = assignee.assignedUserId ? "assigned_to_me" : "in_queue";
    const milestoneName = normalizeMilestoneName(milestone.name);

    const { data: existing } = await supabase
      .from("approval_scheduling_items")
      .select("id, workflow_status")
      .eq("event_id", input.eventId)
      .eq("campaign_milestone_id", milestone.id)
      .maybeSingle();

    const resubmitStatuses = new Set([
      "in_queue",
      "assigned_to_me",
      "changes_requested",
    ]);

    const rowPayload = {
      event_id: input.eventId,
      source: "campaign_builder" as const,
      campaign_milestone_id: milestone.id,
      campaign_name: input.campaignName,
      milestone_name: milestoneName,
      workflow_status: workflowStatus,
      assigned_organization_role_id: assignee.organizationRoleId,
      assigned_user_id: assignee.assignedUserId,
      requested_by_user_id: membership?.user.id ?? null,
      delivery_method: preview.deliveryMethod,
      platforms: milestone.platforms,
      schedule_at: scheduleAt,
      caption_text: captionText,
      story_caption:
        preview.captions.find((c) => c.platform === "instagram")?.text ?? null,
      feed_artwork_url: preview.artwork.feedUrl,
      story_artwork_url: preview.artwork.storyUrl,
      manual_upload_link: preview.manualUploadLink.trim() || null,
      manual_email_to: manualEmailFields.manual_email_to,
      manual_email_send_at: manualEmailFields.manual_email_send_at,
      notes: null,
      resolved_at: null,
      requested_at: now,
      updated_at: now,
    };

    let schedulingItemId: string | null = null;

    if (existing?.id && resubmitStatuses.has(existing.workflow_status)) {
      const { data: updated, error } = await supabase
        .from("approval_scheduling_items")
        .update(rowPayload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Failed to update approval scheduling item:", error.message);
        const { reportFailedAction } = await import(
          "@/lib/monitoring/report-error"
        );
        reportFailedAction("approvals", {
          action: "sendCampaignBuilderForApproval.update",
          eventId: input.eventId,
          milestoneId: milestone.id,
          organizationId: organization.id,
          message: error.message,
        });
        continue;
      }

      schedulingItemId = updated?.id ?? existing.id;
    } else if (!existing?.id) {
      const { data: inserted, error } = await supabase
        .from("approval_scheduling_items")
        .insert(rowPayload)
        .select("id")
        .maybeSingle();

      if (error?.code === "42P01") {
        return {
          success: false,
          message:
            "Approval scheduling table is not migrated yet. Run migration 048_approval_scheduling_unified.sql.",
          createdCount: 0,
        };
      }

      if (error || !inserted?.id) {
        console.error("Failed to create approval scheduling item:", error?.message);
        const { reportFailedAction } = await import(
          "@/lib/monitoring/report-error"
        );
        reportFailedAction("approvals", {
          action: "sendCampaignBuilderForApproval.insert",
          eventId: input.eventId,
          milestoneId: milestone.id,
          organizationId: organization.id,
          message: error?.message || "Unable to create approval scheduling item.",
        });
        if (error?.code === "42501") {
          return {
            success: false,
            message:
              "Unable to save approval items (database permissions). Please try again or contact support.",
            createdCount: 0,
          };
        }
        continue;
      }

      schedulingItemId = inserted.id;
    } else if (existing?.id) {
      // Keep workflow status, but refresh display snapshot (name/artwork/caption/schedule).
      const { error } = await supabase
        .from("approval_scheduling_items")
        .update({
          milestone_name: milestoneName,
          campaign_name: input.campaignName,
          caption_text: captionText,
          story_caption:
            preview.captions.find((c) => c.platform === "instagram")?.text ?? null,
          feed_artwork_url: preview.artwork.feedUrl,
          story_artwork_url: preview.artwork.storyUrl,
          manual_upload_link: preview.manualUploadLink.trim() || null,
          manual_email_to: manualEmailFields.manual_email_to,
          manual_email_send_at: manualEmailFields.manual_email_send_at,
          schedule_at: scheduleAt,
          delivery_method: preview.deliveryMethod,
          platforms: milestone.platforms,
          updated_at: now,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(
          "Failed to refresh approval scheduling snapshot:",
          error.message,
        );
      }
      continue;
    } else {
      continue;
    }

    createdCount += 1;

    if (recipientEmail && schedulingItemId) {
      await sendApprovalAssignedEmail({
        eventId: input.eventId,
        campaignName: input.campaignName,
        milestoneName,
        recipientEmail,
        approverRole: assignee.organizationRoleName ?? "committee-chair",
        schedulingItemId,
      });
    }
  }

  if (createdCount === 0) {
    return {
      success: false,
      message: "Unable to create approval queue items.",
      createdCount: 0,
    };
  }

  void role;

  const skippedNote =
    skippedWithoutArtwork.length > 0
      ? ` Skipped without artwork: ${skippedWithoutArtwork.join(", ")}.`
      : "";

  return {
    success: true,
    message: `${createdCount} milestone${createdCount === 1 ? "" : "s"} sent for approval.${skippedNote}`,
    createdCount,
  };
}

export async function sendCampaignBuilderForApprovalFromSession(
  eventId: string,
  campaignName: string,
): Promise<SendCampaignBuilderForApprovalResult> {
  const session = await loadCampaignBuilderSessionAction(eventId);
  if (!session) {
    return {
      success: false,
      message: "Campaign session not found. Save your work in Create with AI first.",
      createdCount: 0,
    };
  }

  return sendCampaignBuilderForApproval({
    eventId,
    campaignName: campaignName || session.inspiration.campaignName,
    milestones: session.milestones,
    previewContents: session.previewContents,
  });
}
