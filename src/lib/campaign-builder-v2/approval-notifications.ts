import "server-only";

import {
  buildApprovalContentPreviewText,
  buildApprovalEmailArtworkVariables,
  buildApprovalTransactionalEmail,
  type ApprovalEmailContentPreview,
} from "@/lib/email/approval-content-preview";
import {
  isEmailConfigured,
  resolveSocialsFromAddress,
  sendEmail,
  sendTemplateEmail,
} from "@/lib/email/send";
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
import { escapeHtml } from "@/lib/utils/html";

export interface CampaignApprovalNotificationInput extends ApprovalEmailContentPreview {
  eventId: string;
  campaignName: string;
  recipientEmail: string;
  milestoneName: string;
  approverRole?: string;
  /** Flyer composer milestone id (`flyer-composer:…`) selects flyer email copy. */
  campaignMilestoneId?: string | null;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
}

export { approvalEmailFormatVariables } from "@/lib/email/approval-content-preview";

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
  html: string;
  text: string;
  schedulingItemId?: string | null;
  approvalRequestId?: string | null;
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

  // App-rendered HTML (not Resend templates): template variables HTML-escape
  // markup, so <img> thumbnails never show when injected as ARTWORK_PREVIEW_HTML.
  const result = await sendEmail({
    to: [input.recipientEmail],
    subject: input.subject,
    html: input.html,
    text: input.text,
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
    message: "Email notification sent.",
  };
}

function contentLabel(milestoneName: string, campaignName: string): string {
  return `${milestoneName} in ${campaignName}`;
}

function artworkEmailBits(
  input: ApprovalEmailContentPreview & {
    campaignMilestoneId?: string | null;
    ctaLabel?: string;
  },
  isFlyer: boolean,
) {
  const artwork = buildApprovalEmailArtworkVariables({
    isFlyer,
    feedArtworkUrl: input.feedArtworkUrl,
    storyArtworkUrl: input.storyArtworkUrl,
    captionText: input.captionText,
    storyCaption: input.storyCaption,
    ctaLabel: input.ctaLabel,
  });
  const artworkPreviewText = buildApprovalContentPreviewText({
    feedArtworkUrl: input.feedArtworkUrl,
    storyArtworkUrl: input.storyArtworkUrl,
    captionText: input.captionText,
    storyCaption: input.storyCaption,
    contentKind: isFlyer ? "flyer" : "social",
  });
  return { artwork, artworkPreviewText };
}

export async function sendApprovalAssignedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const { isFlyerComposerMilestoneId } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyer =
    input.contentKind === "flyer" ||
    isFlyerComposerMilestoneId(input.campaignMilestoneId);
  const { artwork, artworkPreviewText } = artworkEmailBits(
    { ...input, ctaLabel: "Review approval" },
    isFlyer,
  );
  const label = contentLabel(input.milestoneName, input.campaignName);
  const href = approvalsPageUrl(input.eventId);
  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Approval assigned to you",
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(label)}</strong> is waiting for your review.`,
    bodyText: `${label} is waiting for your review.`,
    previewHeading: "Artwork to review",
    artworkSummary: artwork.ARTWORK_SUMMARY,
    artworkPreviewHtml: artwork.ARTWORK_PREVIEW_HTML,
    artworkPreviewText,
    ctaLabel: artwork.CTA_LABEL,
    actionUrl: href,
    footer: "You're receiving this because approvals need your attention.",
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_assigned",
    recipientEmail: input.recipientEmail,
    subject: `Approval needed: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
    schedulingItemId: input.schedulingItemId,
    approvalRequestId: input.approvalRequestId,
  });
}

/** After changes_requested — creator resent; notify approver again with clear subject. */
export async function sendApprovalResubmittedEmail(
  input: CampaignApprovalNotificationInput,
): Promise<CampaignApprovalNotificationResult> {
  const { isFlyerComposerMilestoneId } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyer =
    input.contentKind === "flyer" ||
    isFlyerComposerMilestoneId(input.campaignMilestoneId);
  const { artwork, artworkPreviewText } = artworkEmailBits(
    { ...input, ctaLabel: "Review approval" },
    isFlyer,
  );
  const label = contentLabel(input.milestoneName, input.campaignName);
  const href = approvalsPageUrl(input.eventId);
  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Ready for another look",
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(label)}</strong> was updated and sent back for review.`,
    bodyText: `${label} was updated and sent back for review.`,
    previewHeading: "Updated artwork",
    artworkSummary: artwork.ARTWORK_SUMMARY,
    artworkPreviewHtml: artwork.ARTWORK_PREVIEW_HTML,
    artworkPreviewText,
    ctaLabel: artwork.CTA_LABEL,
    actionUrl: href,
    footer: "You're receiving this because approvals need your attention.",
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "approval_resubmitted",
    recipientEmail: input.recipientEmail,
    subject: `Resubmitted for approval: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
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
  const { isFlyerComposerMilestoneId, flyerComposerEditHref } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyer =
    input.contentKind === "flyer" ||
    isFlyerComposerMilestoneId(input.campaignMilestoneId);
  const { artwork, artworkPreviewText } = artworkEmailBits(input, isFlyer);
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const reviewHref = `${base.replace(/\/$/, "")}/events/${input.eventId}/campaign-builder#review`;
  const editPreviewHref = isFlyer
    ? flyerComposerEditHref({ absolute: true })
    : input.campaignMilestoneId
      ? absoluteCampaignBuilderPreviewMilestoneHref(
          input.eventId,
          input.campaignMilestoneId,
        )
      : null;
  const editArtworkHref = isFlyer
    ? flyerComposerEditHref({ absolute: true })
    : input.campaignMilestoneId
      ? absoluteCampaignBuilderEditArtworkHref(
          input.eventId,
          input.campaignMilestoneId,
        )
      : null;
  const primaryHref = editArtworkHref ?? editPreviewHref ?? reviewHref;
  const label = contentLabel(input.milestoneName, input.campaignName);
  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Changes requested",
    bodyHtml: `A teammate asked for an update to <strong style="color:#14241c;">${escapeHtml(label)}</strong>.`,
    bodyText: `A teammate asked for an update to ${label}.`,
    previewHeading: "Current artwork",
    artworkSummary: artwork.ARTWORK_SUMMARY,
    artworkPreviewHtml: artwork.ARTWORK_PREVIEW_HTML,
    artworkPreviewText,
    ctaLabel: artwork.CTA_LABEL,
    actionUrl: primaryHref,
    detailHeading: "What to fix",
    detailBody: input.comment,
    footer: "Sent by Hey Ralli",
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "change_requested",
    recipientEmail: input.recipientEmail,
    subject: `Changes requested: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
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
    campaignMilestoneId?: string | null;
    schedulingItemId?: string | null;
    approvalRequestId?: string | null;
  },
): Promise<CampaignApprovalNotificationResult> {
  const { isFlyerComposerMilestoneId } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyer =
    input.contentKind === "flyer" ||
    isFlyerComposerMilestoneId(input.campaignMilestoneId);
  const { artwork, artworkPreviewText } = artworkEmailBits(
    {
      ...input,
      ctaLabel: isFlyer ? "View in Approvals" : "View schedule",
    },
    isFlyer,
  );
  const href = approvalsPageUrl(input.eventId);
  const label = contentLabel(input.milestoneName, input.campaignName);
  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Content approved",
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(label)}</strong> is approved and ready for delivery.`,
    bodyText: `${label} is approved and ready for delivery.`,
    previewHeading: "Approved artwork",
    artworkSummary: artwork.ARTWORK_SUMMARY,
    artworkPreviewHtml: artwork.ARTWORK_PREVIEW_HTML,
    artworkPreviewText,
    ctaLabel: artwork.CTA_LABEL,
    actionUrl: href,
    footer: "Sent by Hey Ralli",
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "content_approved",
    recipientEmail: input.recipientEmail,
    subject: `Approved: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
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
    campaignMilestoneId?: string | null;
    schedulingItemId?: string | null;
  },
): Promise<CampaignApprovalNotificationResult> {
  const { isFlyerComposerMilestoneId } = await import(
    "@/lib/flyer-composer/approval"
  );
  const isFlyer =
    input.contentKind === "flyer" ||
    isFlyerComposerMilestoneId(input.campaignMilestoneId);
  const { artwork, artworkPreviewText } = artworkEmailBits(
    { ...input, ctaLabel: "View in Approvals" },
    isFlyer,
  );
  const href = approvalsPageUrl(input.eventId);
  const label = contentLabel(input.milestoneName, input.campaignName);
  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "SCHEDULE",
    headline: "Scheduled for delivery",
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(label)}</strong> is scheduled for ${escapeHtml(input.scheduleLabel)}.`,
    bodyText: `${label} is scheduled for ${input.scheduleLabel}.`,
    previewHeading: "Scheduled artwork",
    artworkSummary: artwork.ARTWORK_SUMMARY,
    artworkPreviewHtml: artwork.ARTWORK_PREVIEW_HTML,
    artworkPreviewText,
    ctaLabel: artwork.CTA_LABEL,
    actionUrl: href,
    footer: "Sent by Hey Ralli",
  });

  return dispatchApprovalEmail({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    subject: `Scheduled: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
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

  if (!isEmailConfigured()) {
    await logApprovalNotification({
      eventId: input.eventId,
      notificationType: "scheduled_delivery",
      recipientEmail: input.recipientEmail,
      status: "skipped",
      errorMessage: "RESEND_API_KEY is not configured.",
      schedulingItemId: input.schedulingItemId,
    });
    return {
      success: false,
      wired: false,
      message:
        "Email isn’t set up yet — your team was notified in the app only.",
    };
  }

  // Story post kit still uses the Resend template + optional image attachments.
  const result = await sendTemplateEmail({
    to: [input.recipientEmail],
    subject: content.subject,
    templateId: "story-post-kit",
    variables: {
      CONTENT_NAME: `${input.campaignName} — ${input.milestoneName}`,
      ACTION_URL: approvalsPageUrl(input.eventId),
    },
    attachments: scheduledAt ? undefined : content.attachments,
    scheduledAt: scheduledAt ?? undefined,
    from: resolveSocialsFromAddress(),
    idempotencyKey: `scheduled_delivery/${input.schedulingItemId ?? input.eventId}`,
  });

  await logApprovalNotification({
    eventId: input.eventId,
    notificationType: "scheduled_delivery",
    recipientEmail: input.recipientEmail,
    status: result.success ? "sent" : "failed",
    providerMessageId: result.id ?? null,
    errorMessage: result.error ?? null,
    schedulingItemId: input.schedulingItemId,
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
    message: scheduledAt
      ? "Post kit email scheduled."
      : "Email notification sent.",
  };
}
