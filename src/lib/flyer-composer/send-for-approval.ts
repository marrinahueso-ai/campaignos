import "server-only";

import { randomUUID } from "node:crypto";

import { hasPermission } from "@/lib/access-templates/effective-access";
import {
  getActiveMembership,
  getOrganizationUsers,
} from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import {
  logApprovalNotificationSkipped,
  sendApprovalAssignedEmail,
  sendApprovalResubmittedEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { logEventActivity } from "@/lib/event-workspace/activity-log";
import { getEventById } from "@/lib/events/queries";
import {
  FLYER_COMPOSER_CAMPAIGN_NAME,
  buildFlyerComposerMilestoneId,
  flyerComposerApprovalTitle,
  isPersistableFlyerApprovalImageUrl,
} from "@/lib/flyer-composer/approval";
import { markFlyerNeedsApproval } from "@/lib/flyers/actions";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { assertSafeOutboundUrl, supabaseStorageHostPatterns } from "@/lib/security/safe-outbound-url";
import { createClient } from "@/lib/supabase/server";

export type SendFlyerComposerForApprovalInput = {
  /** Optional campaign link. When omitted, Approvals row is org-scoped. */
  eventId?: string | null;
  /** Stable client key so resubmits update the same Approvals row. */
  submissionKey: string;
  /** Durable library id — when set, used as the milestone submission key. */
  flyerId?: string | null;
  imageUrl: string;
  versionId?: string | null;
  headline?: string | null;
  orgName?: string | null;
  templateName?: string | null;
  captionText?: string | null;
};

export type SendFlyerComposerForApprovalResult = {
  success: boolean;
  message: string;
  schedulingItemId: string | null;
  workflowStatus: "in_queue" | "assigned_to_me" | null;
  campaignMilestoneId: string | null;
  feedArtworkUrl: string | null;
};

function emailForUserId(
  orgUsers: Awaited<ReturnType<typeof getOrganizationUsers>>,
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  return orgUsers.find((member) => member.id === userId)?.email ?? null;
}

async function ensureHostedFlyerImageUrl(
  imageUrl: string,
  organizationId: string,
): Promise<{ url: string | null; error: string | null }> {
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    const safe = assertSafeOutboundUrl(trimmed, {
      allowHttp: false,
      allowedHostPatterns: supabaseStorageHostPatterns(),
    });
    if (!safe.ok) {
      return {
        url: null,
        error: "Flyer image must come from Hey Ralli storage.",
      };
    }
    return { url: safe.url.toString(), error: null };
  }

  const match = trimmed.match(/^data:image\/([\w+.-]+);base64,(.+)$/i);
  if (!match?.[2]) {
    return {
      url: null,
      error: "Flyer image must be a hosted URL or image data URL.",
    };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return { url: null, error: "Could not read flyer image data." };
  }

  if (!bytes.length) {
    return { url: null, error: "Flyer image data is empty." };
  }

  const ext = (match[1] || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const storagePath = `flyer-composer/${organizationId}/approvals/${randomUUID()}.${ext}`;
  const uploaded = await uploadArtworkBytes({
    storagePath,
    bytes,
    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
  });

  if (!uploaded.success || !uploaded.publicUrl) {
    return {
      url: null,
      error: uploaded.error || "Unable to store flyer image for approval.",
    };
  }

  return { url: uploaded.publicUrl, error: null };
}

/**
 * Submit the selected flyer version into the unified Approvals queue
 * (`approval_scheduling_items`), same family as Create with AI Social.
 * Uses delivery_method `draft-only` (print asset — no Meta schedule).
 *
 * When `flyerId` is set, the milestone key is the durable flyer id and the
 * `flyers` row is updated to `needs_approval` after upsert.
 * When `eventId` is omitted, the Approvals row is org-scoped (like newsletters).
 */
export async function sendFlyerComposerForApproval(
  input: SendFlyerComposerForApprovalInput,
): Promise<SendFlyerComposerForApprovalResult> {
  if (!(await hasPermission("submit_approval"))) {
    return {
      success: false,
      message: "You do not have permission to send drafts for approval.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  const organization = await getCurrentOrganization();
  const membership = await getActiveMembership();
  if (!organization) {
    return {
      success: false,
      message: "Organization not found.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  const eventId = input.eventId?.trim() || null;
  const flyerId = input.flyerId?.trim() || null;
  const event = eventId ? await getEventById(eventId) : null;

  if (eventId && !event) {
    return {
      success: false,
      message: "Organization or campaign not found.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  if (!isPersistableFlyerApprovalImageUrl(input.imageUrl)) {
    return {
      success: false,
      message: "Generate or select a flyer version before sending for approval.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  const hosted = await ensureHostedFlyerImageUrl(
    input.imageUrl,
    organization.id,
  );
  if (!hosted.url) {
    return {
      success: false,
      message: hosted.error || "Unable to prepare flyer image for approval.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  const submissionKey = flyerId || input.submissionKey;
  let campaignMilestoneId: string;
  try {
    campaignMilestoneId = buildFlyerComposerMilestoneId(submissionKey);
  } catch {
    return {
      success: false,
      message: "Missing approval submission key.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId: null,
      feedArtworkUrl: null,
    };
  }

  const milestoneName = flyerComposerApprovalTitle({
    headline: input.headline,
    orgName: input.orgName,
    templateName: input.templateName,
  });
  const captionText =
    input.captionText?.trim() ||
    [input.orgName?.trim(), input.headline?.trim()].filter(Boolean).join(" · ") ||
    null;

  const assignee = await resolveApprovalAssignee(
    organization.id,
    event?.approvalOrganizationRoleId ?? null,
  );
  const workflowStatus = assignee.assignedUserId
    ? ("assigned_to_me" as const)
    : ("in_queue" as const);

  const supabase = await createClient();
  const now = new Date().toISOString();

  let existingQuery = supabase
    .from("approval_scheduling_items")
    .select("id, workflow_status, assigned_user_id")
    .eq("campaign_milestone_id", campaignMilestoneId);

  if (eventId) {
    existingQuery = existingQuery.eq("event_id", eventId);
  } else {
    existingQuery = existingQuery
      .eq("organization_id", organization.id)
      .is("event_id", null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  const resubmitStatuses = new Set([
    "in_queue",
    "assigned_to_me",
    "changes_requested",
  ]);
  const isResubmitAfterChanges =
    existing?.workflow_status === "changes_requested";

  const rowPayload = {
    event_id: eventId,
    organization_id: organization.id,
    source: "campaign_builder" as const,
    campaign_milestone_id: campaignMilestoneId,
    campaign_name: FLYER_COMPOSER_CAMPAIGN_NAME,
    milestone_name: milestoneName,
    workflow_status: workflowStatus,
    assigned_organization_role_id: assignee.organizationRoleId,
    assigned_user_id: assignee.assignedUserId,
    requested_by_user_id: membership?.user.id ?? null,
    delivery_method: "draft-only",
    platforms: [] as string[],
    schedule_at: null,
    caption_text: captionText,
    story_caption: null,
    feed_artwork_url: hosted.url,
    story_artwork_url: null,
    manual_upload_link: null,
    manual_email_to: null,
    manual_email_send_at: null,
    notes: null,
    resolved_at: null,
    requested_at: now,
    updated_at: now,
  };

  let schedulingItemId: string | null = null;
  let shouldNotify = false;

  if (existing?.id && resubmitStatuses.has(existing.workflow_status)) {
    const { data: updated, error } = await supabase
      .from("approval_scheduling_items")
      .update(rowPayload)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Failed to update flyer approval item:", error.message);
      return {
        success: false,
        message: "Unable to update approval queue item.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
      };
    }
    schedulingItemId = updated?.id ?? existing.id;
    shouldNotify = true;
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
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
      };
    }

    if (error || !inserted?.id) {
      console.error("Failed to create flyer approval item:", error?.message);
      return {
        success: false,
        message:
          error?.code === "42501"
            ? "Unable to save approval items (database permissions). Please try again or contact support."
            : "Unable to create approval queue item.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
      };
    }

    schedulingItemId = inserted.id;
    shouldNotify = true;
  } else if (existing?.id) {
    // Already approved/scheduled — refresh snapshot only.
    const { error } = await supabase
      .from("approval_scheduling_items")
      .update({
        milestone_name: milestoneName,
        campaign_name: FLYER_COMPOSER_CAMPAIGN_NAME,
        caption_text: captionText,
        feed_artwork_url: hosted.url,
        story_artwork_url: null,
        delivery_method: "draft-only",
        platforms: [],
        organization_id: organization.id,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to refresh flyer approval snapshot:", error.message);
      return {
        success: false,
        message: "Unable to refresh approval item.",
        schedulingItemId: existing.id,
        workflowStatus: null,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
      };
    }

    if (flyerId) {
      await markFlyerNeedsApproval({
        flyerId,
        schedulingItemId: existing.id,
        previewImageUrl: hosted.url,
      });
    }

    return {
      success: true,
      message: "Flyer artwork updated on the existing approval item.",
      schedulingItemId: existing.id,
      workflowStatus: null,
      campaignMilestoneId,
      feedArtworkUrl: hosted.url,
    };
  }

  if (!schedulingItemId) {
    return {
      success: false,
      message: "Unable to create approval queue item.",
      schedulingItemId: null,
      workflowStatus: null,
      campaignMilestoneId,
      feedArtworkUrl: hosted.url,
    };
  }

  if (flyerId) {
    const marked = await markFlyerNeedsApproval({
      flyerId,
      schedulingItemId,
      previewImageUrl: hosted.url,
    });
    if (!marked.ok) {
      return {
        success: false,
        message:
          "Approval item created, but the flyer status could not be updated.",
        schedulingItemId,
        workflowStatus,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
      };
    }
  }

  if (eventId) {
    await logEventActivity({
      eventId,
      activityType: "board_approval",
      title: "Flyer sent for approval",
      description: `${milestoneName} is waiting for review.`,
    });
  }

  if (shouldNotify) {
    const orgUsers = await getOrganizationUsers(organization.id);
    const currentAssigneeEmail = emailForUserId(
      orgUsers,
      assignee.assignedUserId,
    );
    const priorAssigneeEmail = emailForUserId(
      orgUsers,
      existing?.assigned_user_id,
    );
    const recipientEmail = currentAssigneeEmail ?? priorAssigneeEmail;
    const notificationType = isResubmitAfterChanges
      ? ("approval_resubmitted" as const)
      : ("approval_assigned" as const);

    let emailNote = "";
    if (!recipientEmail) {
      const skipReason =
        "No approver email — assign an approver in Team Access or on the event.";
      if (eventId) {
        await logApprovalNotificationSkipped({
          eventId,
          notificationType,
          recipientEmail: null,
          errorMessage: skipReason,
          schedulingItemId,
        });
      }
      emailNote = ` Approver email skipped: ${skipReason}`;
    } else if (eventId) {
      const emailInput = {
        eventId,
        campaignName: FLYER_COMPOSER_CAMPAIGN_NAME,
        milestoneName,
        recipientEmail,
        approverRole: assignee.organizationRoleName ?? "committee-chair",
        schedulingItemId,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
        storyArtworkUrl: null as string | null,
        captionText,
        storyCaption: null as string | null,
        contentKind: "flyer" as const,
      };
      const notifyResult = isResubmitAfterChanges
        ? await sendApprovalResubmittedEmail(emailInput)
        : await sendApprovalAssignedEmail(emailInput);
      if (notifyResult.wired) {
        emailNote = ` Approver notified at ${recipientEmail}.`;
      } else {
        emailNote = ` Approver email skipped: ${notifyResult.message}`;
      }
    } else {
      emailNote = ` Approver notified at ${recipientEmail}.`;
      // Org-scoped flyers: reuse assigned email with empty event (hub deep link).
      const emailInput = {
        eventId: "",
        campaignName: FLYER_COMPOSER_CAMPAIGN_NAME,
        milestoneName,
        recipientEmail,
        approverRole: assignee.organizationRoleName ?? "committee-chair",
        schedulingItemId,
        campaignMilestoneId,
        feedArtworkUrl: hosted.url,
        storyArtworkUrl: null as string | null,
        captionText,
        storyCaption: null as string | null,
        contentKind: "flyer" as const,
      };
      const notifyResult = isResubmitAfterChanges
        ? await sendApprovalResubmittedEmail(emailInput)
        : await sendApprovalAssignedEmail(emailInput);
      emailNote = notifyResult.wired
        ? ` Approver notified at ${recipientEmail}.`
        : ` Approver email skipped: ${notifyResult.message}`;
    }

    return {
      success: true,
      message: `${
        isResubmitAfterChanges
          ? "Flyer resent for approval."
          : "Flyer sent for approval."
      }${emailNote}`,
      schedulingItemId,
      workflowStatus,
      campaignMilestoneId,
      feedArtworkUrl: hosted.url,
    };
  }

  return {
    success: true,
    message: isResubmitAfterChanges
      ? "Flyer resent for approval."
      : "Flyer sent for approval.",
    schedulingItemId,
    workflowStatus,
    campaignMilestoneId,
    feedArtworkUrl: hosted.url,
  };
}

export type FlyerComposerApprovalStatus = {
  schedulingItemId: string;
  workflowStatus: string;
  milestoneName: string;
  feedArtworkUrl: string | null;
  notes: string | null;
  eventId: string | null;
  campaignMilestoneId: string;
};

export async function getFlyerComposerApprovalStatus(input: {
  eventId?: string | null;
  submissionKey: string;
  flyerId?: string | null;
}): Promise<FlyerComposerApprovalStatus | null> {
  const eventId = input.eventId?.trim() || null;
  const submissionKey = input.flyerId?.trim() || input.submissionKey;

  let campaignMilestoneId: string;
  try {
    campaignMilestoneId = buildFlyerComposerMilestoneId(submissionKey);
  } catch {
    return null;
  }

  if (eventId) {
    const event = await getEventById(eventId);
    if (!event) return null;
  }

  const organization = await getCurrentOrganization();
  if (!organization && !eventId) return null;

  const supabase = await createClient();
  let query = supabase
    .from("approval_scheduling_items")
    .select(
      "id, workflow_status, milestone_name, feed_artwork_url, notes, event_id, campaign_milestone_id",
    )
    .eq("campaign_milestone_id", campaignMilestoneId);

  if (eventId) {
    query = query.eq("event_id", eventId);
  } else if (organization) {
    query = query.eq("organization_id", organization.id).is("event_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;

  return {
    schedulingItemId: data.id,
    workflowStatus: data.workflow_status,
    milestoneName: data.milestone_name,
    feedArtworkUrl: data.feed_artwork_url,
    notes: data.notes,
    eventId: data.event_id,
    campaignMilestoneId: data.campaign_milestone_id,
  };
}
