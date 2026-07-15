import "server-only";

import { Resend } from "resend";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** ISO 8601 or natural language — Resend schedules delivery (no attachments). */
  scheduledAt?: string;
  /** Override From (defaults to RESEND_FROM_EMAIL). */
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export function resolveFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Hey Ralli <notifications@heyralli.com>"
  );
}

/** From address for Socials / manual-upload kits. */
export function resolveSocialsFromAddress(): string {
  return (
    process.env.RESEND_SOCIALS_FROM_EMAIL?.trim() ||
    "Hey Ralli Socials <Socials@heyralli.com>"
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  if (input.to.length === 0) {
    return {
      success: false,
      error: "No recipients.",
    };
  }

  const resend = new Resend(apiKey);
  const isScheduled = Boolean(input.scheduledAt?.trim());

  const { data, error } = await resend.emails.send({
    from: input.from?.trim() || resolveFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(isScheduled ? { scheduledAt: input.scheduledAt!.trim() } : {}),
    // Resend does not allow attachments on scheduled emails.
    ...(!isScheduled && input.attachments?.length
      ? {
          attachments: input.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
          })),
        }
      : {}),
  });

  if (error) {
    const { reportIntegrationError, reportFailedAction } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("resend", error, { action: "sendEmail" });
    reportFailedAction("resend", {
      action: "sendEmail",
      message: error.message,
    });
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    id: data?.id,
  };
}
