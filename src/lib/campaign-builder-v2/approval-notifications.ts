import "server-only";

import type { ApprovalEmailContentPreview } from "@/lib/email/approval-content-preview";
import {
  isEmailConfigured,
  resolveSocialsFromAddress,
  sendTemplateEmail,
} from "@/lib/email/send";
import type { EmailAttachment } from "@/lib/email/send";
import { buildSocialsManualUploadEmail } from "@/lib/email/socials-manual-upload-email";
import {
  absoluteCampaignBuilderEditArtworkHref,
  absoluteCampaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import {
  isApprovalNeedsAttentionType,
} from "@/lib/settings-v2/account-notification-prefs";
import { getAccountNotificationPreferencesForEmail } from "@/lib/settings-v2/account-queries";
import { createClient } from "@/lib/supabase/server";

export interface CampaignApprovalNotificationInput extends ApprovalEmailContentPreview {
  eventId: string;
  campaignName: string;
  recipientEmail: string;
  milestoneName: string;
  approverRole?: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}

export interface CampaignApprovalNotificationResult {
  success: boolean;
  message: string;
  /** True when Resend sent; false when stubbed, skipped, or misconfigured. */
  wired: boolean;
}

export interface CampaignManualUploadEmailInput {
  eventId: string;
  campaignName: string;
  milestoneName: string;
  recipientEmail: string;
  scheduleLabel: string;
  schedulingItemId?: string | null;
  storyArtworkUrl?: string | null;
  storyCaption?: string | null;
  feedCaption?: string | null;
  uploadLink?: string | null;
  organizationName?: string | null;
  /** When set (ISO), Resend queues delivery for that time. */
  scheduledAt?: string | null;
}

type NotificationType =
  | "approval_assigned"
  | "approval_resubmitted"
  | "change_requested"
  | "content_approved"
  | "scheduled_delivery";

/** Persist a skipped notification attempt (e.g. no resolvable approver email). */
export async function logApprovalNotificationSkipped(input: {
  eventId: string;
  notificationType: NotificationType;
  recipientEmail?: string | null;
  errorMessage: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}): Promise<void> {
  await logApprovalNotification({
    eventId: input.eventId,
    notificationType: input.notificationType,
    recipientEmail: input.recipientEmail ?? null,
    status: "skipped",
    errorMessage: input.errorMessage,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

async function logApprovalNotification(input: {
  eventId: string;
  notificationType: NotificationType;
  recipientEmail: string | null;
  status: "logged" | "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("approval_notification_log").insert({
    event_id: input.eventId,
    notification_type: input.notificationType,
    recipient_email: input.recipientEmail,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    scheduling_item_id: input.schedulingItemId ?? null,
    approval_request_id: input.approvalRequestId ?? null,
  });

  if (error?.code === "42P01") {
    console.info("[approval-notification]", {
      type: input.notificationType,
      eventId: input.eventId,
      recipient: input.recipientEmail,
      status: input.status,
      error: input.errorMessage,
    });
    return;
  }

  if (error) {
    console.error("Failed to log approval notification:", error.message);
  }
}

function approvalsPageUrl(eventId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${base}/approvals?event=${eventId}`;
}

async function dispatchApprovalEmail(input: {
  eventId: string;
  notificationType: NotificationType;
  recipientEmail: string;
  subject: string;
  templateId: string;
  variables: Record<string, string | number>;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
  attachments?: EmailAttachment[];
  scheduledAt?: string | null;
  from?: string | null;
}): Promise<CampaignApprovalNotificationResult> {
  if (isApprovalNeedsAttentionType(input.notificationType)) {
    const prefs = await getAccountNotificationPreferencesForEmail(
      input.recipientEmail,
    );
    if (!prefs.approvalNeedsAttention) {
      await logApprovalNotification({
        eventId: input.eventId,
        notificationType: input.notificationType,
        recipientEmail: input.recipientEmail,
        status: "skipped",
        errorMessage:
          "Recipient opted out of approval-needs-attention email notifications.",
        schedulingItemId: input.schedulingItemId,
        approvalRequestId: input.approvalRequestId,
      });

      return {
        success: true,
        wired: false,
        message: "Skipped — recipient muted approval email notifications.",
      };
    }
  }

  if (!isEmailConfigured()) {
    await logApprovalNotification({
      eventId: input.eventId,
      notificationType: input.notificationType,
      recipientEmail: input.recipientEmail,
      status: "skipped",
      errorMessage: "RESEND_API_KEY is not configured.",
      schedulingItemId: input.schedulingItemId,
      approvalRequestId: input.approvalRequestId,
    });

    return {
      success: false,
      wired: false,
      message:
        "Email isn’t set up yet — your team was notified in the app only.",
    };
  }

  const result = await sendTemplateEmail({
    to: [input.recipientEmail],
    subject: input.subject,
    templateId: input.templateId,
    variables: input.variables,
    attachments: input.scheduledAt ? undefined : input.attachments,
    scheduledAt: input.scheduledAt ?? undefined,
    from: input.from ?? undefined,
    idempotencyKey: `${input.notificationType}/${input.schedulingItemId ?? input.approvalRequestId ?? input.eventId}`,
  });

  await logApprovalNotification({
    eventId: input.eventId,
    notificationType: input.notificationType,
    recipientEmail: input.recipientEmail,
    status: result.success ? "sent" : "failed",
    providerMessageId: result.id ?? null,
    errorMessage: result.error ?? null,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });

  if (!result.success) {
    return {
      success: false,
      wired: false,
      message: result.error ?? "Failed to send email notification.",
    };
  }

  return {
    success: true,
    wired: true,
    message: input.scheduledAt
      ? "Post kit email scheduled."
      : "Email notification sent.",
  };
}

export async function sendApprovalAssignedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_assigned",
    recipientEmail: input.recipientEmail,
    subject: `Approval needed: ${input.milestoneName}`,
    templateId: "approval-assigned",
    variables: {
      CONTENT_NAME: `${input.milestoneName} in ${input.campaignName}`,
      ACTION_URL: href,
    },
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

/** After changes_requested — creator resent; notify approver again with clear subject. */
export async function sendApprovalResubmittedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_resubmitted",
    recipientEmail: input.recipientEmail,
    subject: `Resubmitted for approval: ${input.milestoneName}`,
    templateId: "approval-resubmitted",
    variables: {
      CONTENT_NAME: `${input.milestoneName} in ${input.campaignName}`,
      ACTION_URL: href,
    },
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendChangeRequestedEmail(
  input: ApprovalEmailContentPreview & {
    eventId: string;
    campaignName: string;
    milestoneName: string;
    recipientEmail: string;
    comment: string;
    campaignMilestoneId?: string | null;
    schedulingItemId?: string | null;
    approvalRequestId?: string | null;
  },
): Promise<CampaignApprovalNotificationResult> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const reviewHref = `${base.replace(/\/$/, "")}/events/${input.eventId}/campaign-builder#review`;
  const editPreviewHref = input.campaignMilestoneId
    ? absoluteCampaignBuilderPreviewMilestoneHref(
        input.eventId,
        input.campaignMilestoneId,
      )
    : null;
  const editArtworkHref = input.campaignMilestoneId
    ? absoluteCampaignBuilderEditArtworkHref(
        input.eventId,
        input.campaignMilestoneId,
      )
    : null;
  const changeDateHref = editPreviewHref;
  const primaryHref = editArtworkHref ?? changeDateHref ?? reviewHref;
  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "change_requested",
    recipientEmail: input.recipientEmail,
    subject: `Changes requested: ${input.milestoneName}`,
    templateId: "approval-changes-requested",
    variables: {
      CONTENT_NAME: `${input.milestoneName} in ${input.campaignName}`,
      CHANGE_NOTE: input.comment,
      ACTION_URL: primaryHref,
    },
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendContentApprovedEmail(
  input: ApprovalEmailContentPreview & {
    eventId: string;
    campaignName: string;
    milestoneName: string;
    recipientEmail: string;
    schedulingItemId?: string | null;
    approvalRequestId?: string | null;
  },
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "content_approved",
    recipientEmail: input.recipientEmail,
    subject: `Approved: ${input.milestoneName}`,
    templateId: "approval-content-approved",
    variables: {
      CONTENT_NAME: `${input.milestoneName} in ${input.campaignName}`,
      ACTION_URL: href,
    },
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendScheduledDeliveryEmail(
  input: ApprovalEmailContentPreview & {
    eventId: string;
    campaignName: string;
    milestoneName: string;
    recipientEmail: string;
    scheduleLabel: string;
    schedulingItemId?: string | null;
  },
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    subject: `Scheduled: ${input.milestoneName}`,
    templateId: "approval-scheduled-delivery",
    variables: {
      CONTENT_NAME: `${input.milestoneName} in ${input.campaignName}`,
      SCHEDULE_TIME: input.scheduleLabel,
      ACTION_URL: href,
    },
    schedulingItemId: input.schedulingItemId,
  });
}

/** @deprecated Use sendApprovalAssignedEmail */
export async function sendCampaignApprovalNotification(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  return sendApprovalAssignedEmail(input);
}

export async function sendCampaignManualUploadEmail(
  input: CampaignManualUploadEmailInput,
): Promise<CampaignApprovalNotificationResult> {
  const content = await buildSocialsManualUploadEmail({
    eventTitle: input.campaignName,
    milestoneTitle: input.milestoneName,
    scheduledLabel: input.scheduleLabel,
    storyCaption: input.storyCaption ?? null,
    feedCaption: input.feedCaption ?? null,
    eventLink: input.uploadLink ?? null,
    postKitUrl: approvalsPageUrl(input.eventId),
    storyArtworkUrl: input.storyArtworkUrl ?? null,
    organizationName: input.organizationName?.trim() || "Hey Ralli",
  });

  const scheduledAt = input.scheduledAt?.trim() || null;

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    subject: content.subject,
    templateId: "story-post-kit",
    variables: {
      CONTENT_NAME: `${input.campaignName} — ${input.milestoneName}`,
      ACTION_URL: approvalsPageUrl(input.eventId),
    },
    schedulingItemId: input.schedulingItemId,
    // Attachments only for immediate sends — Resend blocks them when scheduled.
    attachments: scheduledAt ? undefined : content.attachments,
    scheduledAt,
    from: resolveSocialsFromAddress(),
  });
}
