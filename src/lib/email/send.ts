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
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function resolveFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Hey Ralli <onboarding@resend.dev>"
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

  const { data, error } = await resend.emails.send({
    from: resolveFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });

  if (error) {
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
