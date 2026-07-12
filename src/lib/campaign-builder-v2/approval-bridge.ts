import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  sendApprovalAssignedEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { getSharedCaptionText } from "@/lib/campaign-builder-v2/caption-utils";
import { derivedPreviewStatus } from "@/lib/campaign-builder-v2/milestone-status";
import { loadCampaignBuilderSessionAction } from "@/lib/campaign-builder-v2/session";
import type {
  CampaignBuilderMilestone,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";
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
    return Boolean(preview) && derivedPreviewStatus(preview!) !== "draft";
  });

  if (milestonesToSubmit.length === 0) {
    return {
      success: false,
      message: "Generate content for at least one milestone before sending for approval.",
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
    const workflowStatus = assignee.assignedUserId ? "assigned_to_me" : "in_queue";

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
      milestone_name: milestone.name,
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
        continue;
      }

      schedulingItemId = inserted.id;
    } else {
      continue;
    }

    createdCount += 1;

    if (recipientEmail && schedulingItemId) {
      await sendApprovalAssignedEmail({
        eventId: input.eventId,
        campaignName: input.campaignName,
        milestoneName: milestone.name,
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

  return {
    success: true,
    message: `${createdCount} milestone${createdCount === 1 ? "" : "s"} sent for approval.`,
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
