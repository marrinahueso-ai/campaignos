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

export interface SendTemplateEmailInput {
  to: string[];
  /** Published Resend template id or alias. */
  templateId: string;
  variables?: Record<string, string | number>;
  /** Overrides template default subject when provided. */
  subject?: string;
  /** Override From (defaults to RESEND_FROM_EMAIL). */
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** Published Resend template alias for Team & Access invites. */
export const TEAM_INVITE_TEMPLATE_ALIAS = "team-invite";

/** Stable published template id (alias fallback also works). */
export const TEAM_INVITE_TEMPLATE_ID = "fc5c274b-e88d-41ca-bdfa-c6a798c3a3bd";

export function resolveTeamInviteTemplateId(): string {
  return (
    process.env.RESEND_TEAM_INVITE_TEMPLATE_ID?.trim() ||
    TEAM_INVITE_TEMPLATE_ID ||
    TEAM_INVITE_TEMPLATE_ALIAS
  );
}

export function resolveFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Hey Ralli <notifications@heyralli.com>"
  );
}

/** From address for manual-upload / story post kits. */
export function resolveSocialsFromAddress(): string {
  return (
    process.env.RESEND_SOCIALS_FROM_EMAIL?.trim() ||
    "Hey Ralli <Socials@heyralli.com>"
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

/** Send via a published Resend dashboard template (id or alias). */
export async function sendTemplateEmail(
  input: SendTemplateEmailInput,
): Promise<SendEmailResult> {
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
  const { data, error } = await resend.emails.send({
    from: input.from?.trim() || resolveFromAddress(),
    to: input.to,
    ...(input.subject?.trim() ? { subject: input.subject.trim() } : {}),
    template: {
      id: input.templateId,
      variables: input.variables,
    },
  });

  if (error) {
    const { reportIntegrationError, reportFailedAction } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("resend", error, { action: "sendTemplateEmail" });
    reportFailedAction("resend", {
      action: "sendTemplateEmail",
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
