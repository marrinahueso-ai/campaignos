import "server-only";

import {
  buildOrganizationWelcomeEmail,
  organizationWelcomeEmailSubject,
} from "@/lib/email/organization-welcome-email";
import {
  isEmailConfigured,
  resolveOrganizationWelcomeTemplateId,
  sendEmail,
  sendTemplateEmail,
} from "@/lib/email/send";

export async function sendOrganizationWelcomeEmail(input: {
  toEmail: string;
  actionUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const toEmail = input.toEmail.trim();
  const actionUrl = input.actionUrl.trim();
  if (!toEmail || !actionUrl) {
    return { success: false, error: "Missing email or setup link." };
  }

  const subject = organizationWelcomeEmailSubject();

  // Prefer the published Resend dashboard template.
  const templateResult = await sendTemplateEmail({
    to: [toEmail],
    templateId: resolveOrganizationWelcomeTemplateId(),
    subject,
    variables: {
      ACTION_URL: actionUrl,
      RECIPIENT_EMAIL: toEmail,
    },
  });

  if (templateResult.success) {
    return { success: true };
  }

  const content = buildOrganizationWelcomeEmail({
    actionUrl,
    email: toEmail,
  });

  const htmlResult = await sendEmail({
    to: [toEmail],
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (htmlResult.success) {
    return { success: true };
  }

  return {
    success: false,
    error:
      templateResult.error ?? htmlResult.error ?? "Could not send welcome email.",
  };
}
