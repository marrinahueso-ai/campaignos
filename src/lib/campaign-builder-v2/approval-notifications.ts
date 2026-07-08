import "server-only";

import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

export interface CampaignApprovalNotificationInput {
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
}

type NotificationType =
  | "approval_assigned"
  | "change_requested"
  | "content_approved"
  | "scheduled_delivery";

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
}): string {
  return `
    <div style="font-family: Georgia, serif; color: #2a2622; background: #f6f2eb; padding: 24px;">
      <h1 style="font-size: 24px; font-weight: 500; margin: 0 0 12px;">${input.heading}</h1>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${input.body}</p>
      <a href="${input.ctaHref}" style="display: inline-block; background: #2a2622; color: #f6f2eb; padding: 10px 18px; text-decoration: none; font-size: 14px;">
        ${input.ctaLabel}
      </a>
    </div>
  `;
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
    message: "Email notification sent.",
  };
}

export async function sendApprovalAssignedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const html = buildApprovalEmailHtml({
    heading: "Approval assigned to you",
    body: `"${input.milestoneName}" in ${input.campaignName} is waiting for your review.`,
    ctaLabel: "Review in Approvals",
    ctaHref: href,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_assigned",
    recipientEmail: input.recipientEmail,
    subject: `Approval needed: ${input.milestoneName}`,
    html,
    text: `Approval assigned: ${input.milestoneName} in ${input.campaignName}. Review at ${href}`,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendChangeRequestedEmail(input: {
  eventId: string;
  campaignName: string;
  milestoneName: string;
  recipientEmail: string;
  comment: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const html = buildApprovalEmailHtml({
    heading: "Changes requested",
    body: `An approver requested changes to "${input.milestoneName}" in ${input.campaignName}. Comment: ${input.comment}`,
    ctaLabel: "View in Create with AI",
    ctaHref: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"}/events/${input.eventId}/campaign-builder#review`,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "change_requested",
    recipientEmail: input.recipientEmail,
    subject: `Changes requested: ${input.milestoneName}`,
    html,
    text: `Changes requested for ${input.milestoneName}: ${input.comment}. Open ${href}`,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendContentApprovedEmail(input: {
  eventId: string;
  campaignName: string;
  milestoneName: string;
  recipientEmail: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const html = buildApprovalEmailHtml({
    heading: "Content approved",
    body: `"${input.milestoneName}" in ${input.campaignName} was approved and is ready for delivery.`,
    ctaLabel: "View schedule",
    ctaHref: href,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "content_approved",
    recipientEmail: input.recipientEmail,
    subject: `Approved: ${input.milestoneName}`,
    html,
    text: `${input.milestoneName} was approved. View schedule at ${href}`,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

export async function sendScheduledDeliveryEmail(input: {
  eventId: string;
  campaignName: string;
  milestoneName: string;
  recipientEmail: string;
  scheduleLabel: string;
  schedulingItemId?: string | null;
}): Promise<CampaignApprovalNotificationResult> {
  const href = approvalsPageUrl(input.eventId);
  const html = buildApprovalEmailHtml({
    heading: "Scheduled for delivery",
    body: `"${input.milestoneName}" in ${input.campaignName} is scheduled for ${input.scheduleLabel}.`,
    ctaLabel: "View in Approvals",
    ctaHref: href,
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    subject: `Scheduled: ${input.milestoneName}`,
    html,
    text: `${input.milestoneName} scheduled for ${input.scheduleLabel}. ${href}`,
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
  return sendScheduledDeliveryEmail({
    eventId: input.eventId,
    campaignName: input.campaignName,
    milestoneName: input.milestoneName,
    recipientEmail: input.recipientEmail,
    scheduleLabel: input.scheduleLabel,
    schedulingItemId: input.schedulingItemId,
  });
}
