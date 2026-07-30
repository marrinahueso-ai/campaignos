import "server-only";

import { resolveSiteOrigin } from "@/lib/site/url";
import { sendTemplateEmail, type SendEmailResult } from "@/lib/email/send";

type RecipientInput = {
  toEmail: string | string[];
  idempotencyKey: string;
};

function recipients(input: RecipientInput): string[] {
  return (Array.isArray(input.toEmail) ? input.toEmail : [input.toEmail])
    .map((email) => email.trim())
    .filter(Boolean);
}

function billingUrl(): string {
  return `${resolveSiteOrigin()}/settings/billing`;
}

export function sendApprovalReminderEmail(
  input: RecipientInput & { contentName: string; actionUrl: string },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: recipients(input),
    templateId: "approval-reminder",
    variables: { CONTENT_NAME: input.contentName, ACTION_URL: input.actionUrl },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendPublishFailedEmail(
  input: RecipientInput & { contentName: string; actionUrl: string },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: recipients(input),
    templateId: "publish-failed",
    variables: { CONTENT_NAME: input.contentName, ACTION_URL: input.actionUrl },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendTrialEndingEmail(
  input: RecipientInput & { daysRemaining: number },
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: recipients(input),
    templateId: "trial-ending",
    variables: { DAYS_REMAINING: input.daysRemaining, ACTION_URL: billingUrl() },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendPaymentFailedEmail(
  input: RecipientInput,
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: recipients(input),
    templateId: "payment-failed",
    variables: { ACTION_URL: billingUrl() },
    idempotencyKey: input.idempotencyKey,
  });
}

export function sendMetaDisconnectedEmail(
  input: RecipientInput,
): Promise<SendEmailResult> {
  return sendTemplateEmail({
    to: recipients(input),
    templateId: "meta-disconnected",
    variables: { ACTION_URL: `${resolveSiteOrigin()}/settings/meta` },
    idempotencyKey: input.idempotencyKey,
  });
}
