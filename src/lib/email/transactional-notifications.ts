import "server-only";

import { resolveSiteOrigin } from "@/lib/site/url";
import { sendTemplateEmail, type SendEmailResult } from "@/lib/email/send";

type RecipientInput = {
  toEmail: string;
  idempotencyKey: string;
};

function billingUrl(): string {
  return `${resolveSiteOrigin()}/settings/billing`;
}

export function sendApprovalReminderEmail(
  input: RecipientInput & { contentName: string; actionUrl: string },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: [input.toEmail],
    templateId: "approval-reminder",
    variables: { CONTENT_NAME: input.contentName, ACTION_URL: input.actionUrl },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendPublishFailedEmail(
  input: RecipientInput & { contentName: string; actionUrl: string },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: [input.toEmail],
    templateId: "publish-failed",
    variables: { CONTENT_NAME: input.contentName, ACTION_URL: input.actionUrl },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendTrialEndingEmail(
  input: RecipientInput & { daysRemaining: number },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: [input.toEmail],
    templateId: "trial-ending",
    variables: { DAYS_REMAINING: input.daysRemaining, ACTION_URL: billingUrl() },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendPaymentFailedEmail(
  input: RecipientInput,
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: [input.toEmail],
    templateId: "payment-failed",
    variables: { ACTION_URL: billingUrl() },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendMetaDisconnectedEmail(
  input: RecipientInput,
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: [input.toEmail],
    templateId: "meta-disconnected",
    variables: { ACTION_URL: `${resolveSiteOrigin()}/settings/meta` },
    idempotencyKey: input.idempotencyKey,
  });
}
