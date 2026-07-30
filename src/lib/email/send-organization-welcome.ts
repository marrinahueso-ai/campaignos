import "server-only";

import {
  isEmailConfigured,
  resolveOrganizationWelcomeTemplateId,
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

  const templateResult = await sendTemplateEmail({
    to: [toEmail],
    templateId: resolveOrganizationWelcomeTemplateId(),
    variables: {
      ACTION_URL: actionUrl,
    },
    idempotencyKey: `organization-welcome/${toEmail}`,
  });

  if (templateResult.success) {
    return { success: true };
  }

  return {
    success: false,
    error:
      templateResult.error ?? "Could not send welcome email.",
  };
}
