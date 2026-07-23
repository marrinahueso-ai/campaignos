import "server-only";

import {
  buildApprovalContentPreviewHtml,
  buildApprovalContentPreviewText,
  type ApprovalEmailContentPreview,
} from "@/lib/email/approval-content-preview";
import { isEmailConfigured, resolveSocialsFromAddress, sendEmail } from "@/lib/email/send";
import type { EmailAttachment } from "@/lib/email/send";
import { buildSocialsManualUploadEmail } from "@/lib/email/socials-manual-upload-email";
import {
  absoluteCampaignBuilderEditArtworkHref,
  absoluteCampaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import { resolveSiteOrigin } from "@/lib/site/url";
import { escapeHtml } from "@/lib/utils/html";
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

function buildApprovalEmailHtml(input: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  content?: ApprovalEmailContentPreview;
}): string {
  const emailPrimaryUrl = `${resolveSiteOrigin()}/go/email-primary`;
  const contentPreview = buildApprovalContentPreviewHtml(input.content ?? {});
  const secondaryCta =
    input.secondaryCtaLabel && input.secondaryCtaHref
      ? `<a href="${escapeHtml(input.secondaryCtaHref)}" style="display: inline-block; color: #2a2622; padding: 10px 0 0 4px; text-decoration: underline; font-size: 13px; margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        ${escapeHtml(input.secondaryCtaLabel)}
      </a>`
      : "";
  return `
    <div style="font-family: Georgia, serif; color: #2a2622; background: #f6f2eb; padding: 24px; max-width: 560px;">
      <p style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5c554c;">Hey Ralli</p>
      <h1 style="font-size: 24px; font-weight: 500; margin: 0 0 12px;">${escapeHtml(input.heading)}</h1>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${input.body}</p>
      ${contentPreview}
      <a href="${escapeHtml(input.ctaHref)}" style="display: inline-block; background: #2a2622; color: #f6f2eb; padding: 10px 18px; text-decoration: none; font-size: 14px; margin-top: 8px;">
        ${escapeHtml(input.ctaLabel)}
      </a>
      ${secondaryCta}
      <p style="margin: 28px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; line-height: 1.5; color: #5c554c;">
        <a href="${escapeHtml(emailPrimaryUrl)}" style="color: #2a2622; font-weight: 600;">Keep Hey Ralli in Primary</a>
        — one-time Gmail setup so approvals, reminders, and post kits aren’t filed under Promotions.
      </p>
    </div>
  `;
}

function contentPreviewFromInput(
  input: ApprovalEmailContentPreview,
): ApprovalEmailContentPreview {
  return {
    feedArtworkUrl: input.feedArtworkUrl ?? null,
    storyArtworkUrl: input.storyArtworkUrl ?? null,
    captionText: input.captionText ?? null,
    storyCaption: input.storyCaption ?? null,
  };
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
  html: string;
  text: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
  attachments?: EmailAttachment[];
  scheduledAt?: string | null;
  from?: string | null;
}): Promise<CampaignApprovalNotificationResult> {
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
        "Email notifications are not configured (set RESEND_API_KEY). Notification was logged only.",
    };
  }

  const result = await sendEmail({
    to: [input.recipientEmail],
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.scheduledAt ? undefined : input.attachments,
    scheduledAt: input.scheduledAt ?? undefined,
    from: input.from ?? undefined,
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
      ? "Manual upload email scheduled with Resend."
      : "Email notification sent.",
  };
}

export async function sendApprovalAssignedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const content = contentPreviewFromInput(input);
  const html = buildApprovalEmailHtml({
    heading: "Approval assigned to you",
    body: `<strong>${escapeHtml(input.milestoneName)}</strong> in ${escapeHtml(input.campaignName)} is waiting for your review.`,
    ctaLabel: "Review in Approvals",
    ctaHref: href,
    content,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_assigned",
    recipientEmail: input.recipientEmail,
    subject: `Approval needed: ${input.milestoneName}`,
    html,
    text: `Approval assigned: ${input.milestoneName} in ${input.campaignName}. Review at ${href}${buildApprovalContentPreviewText(content)}`,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

/** After changes_requested — creator resent; notify approver again with clear subject. */
export async function sendApprovalResubmittedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const content = contentPreviewFromInput(input);
  const html = buildApprovalEmailHtml({
    heading: "Resubmitted for your approval",
    body: `<strong>${escapeHtml(input.milestoneName)}</strong> in ${escapeHtml(input.campaignName)} was updated and sent back for review.`,
    ctaLabel: "Review in Approvals",
    ctaHref: href,
    content,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_resubmitted",
    recipientEmail: input.recipientEmail,
    subject: `Resubmitted for approval: ${input.milestoneName}`,
    html,
    text: `Resubmitted for approval: ${input.milestoneName} in ${input.campaignName}. Review at ${href}${buildApprovalContentPreviewText(content)}`,
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
  const primaryLabel = editArtworkHref
    ? "Edit Artwork"
    : changeDateHref
      ? "Change Date"
      : "View in Create with AI";
  const secondaryCtaLabel = editArtworkHref
    ? changeDateHref
      ? "Change Date"
      : "Open Review step"
    : changeDateHref
      ? "Open Review step"
      : undefined;
  const secondaryCtaHref = editArtworkHref
    ? (changeDateHref ?? reviewHref)
    : changeDateHref
      ? reviewHref
      : undefined;
  const content = contentPreviewFromInput(input);
  const commentBox = `<div style="margin:16px 0;padding:12px 14px;border:1px solid #f0c4c4;background:#fdf2f2;color:#8b3f3f;font-size:14px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><strong style="display:block;margin-bottom:6px;">Change request</strong>${escapeHtml(input.comment)}</div>`;
  const html = buildApprovalEmailHtml({
    heading: "Changes requested",
    body: `An approver requested changes to <strong>${escapeHtml(input.milestoneName)}</strong> in ${escapeHtml(input.campaignName)}. Use <strong>Edit Artwork</strong> or <strong>Change Date</strong> below, then send for re-approval from Preview or Review — regenerating artwork is optional.${commentBox}`,
    ctaLabel: primaryLabel,
    ctaHref: primaryHref,
    secondaryCtaLabel,
    secondaryCtaHref,
    content,
  });

  const textLinks = [
    editArtworkHref ? `Edit Artwork: ${editArtworkHref}` : null,
    changeDateHref ? `Change Date: ${changeDateHref}` : null,
    !editArtworkHref && !changeDateHref ? `Open ${reviewHref}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "change_requested",
    recipientEmail: input.recipientEmail,
    subject: `Changes requested: ${input.milestoneName}`,
    html,
    text: `Changes requested for ${input.milestoneName}: ${input.comment}. ${textLinks}${buildApprovalContentPreviewText(content)}`,
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
  const content = contentPreviewFromInput(input);
  const html = buildApprovalEmailHtml({
    heading: "Content approved",
    body: `<strong>${escapeHtml(input.milestoneName)}</strong> in ${escapeHtml(input.campaignName)} was approved and is ready for delivery.`,
    ctaLabel: "View schedule",
    ctaHref: href,
    content,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "content_approved",
    recipientEmail: input.recipientEmail,
    subject: `Approved: ${input.milestoneName}`,
    html,
    text: `${input.milestoneName} was approved. View schedule at ${href}${buildApprovalContentPreviewText(content)}`,
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
  const content = contentPreviewFromInput(input);
  const html = buildApprovalEmailHtml({
    heading: "Scheduled for delivery",
    body: `<strong>${escapeHtml(input.milestoneName)}</strong> in ${escapeHtml(input.campaignName)} is scheduled for ${escapeHtml(input.scheduleLabel)}.`,
    ctaLabel: "View in Approvals",
    ctaHref: href,
    content,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    subject: `Scheduled: ${input.milestoneName}`,
    html,
    text: `${input.milestoneName} scheduled for ${input.scheduleLabel}. ${href}${buildApprovalContentPreviewText(content)}`,
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
    html: content.html,
    text: content.text,
    schedulingItemId: input.schedulingItemId,
    // Attachments only for immediate sends — Resend blocks them when scheduled.
    attachments: scheduledAt ? undefined : content.attachments,
    scheduledAt,
    from: resolveSocialsFromAddress(),
  });
}
