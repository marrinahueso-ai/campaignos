/**
 * Industry-neutral welcome / create-account email for new organizations.
 * Used as the source of truth for Supabase Auth magic-link HTML
 * (`supabase/templates/magic_link.html`) and in-app copy tests.
 *
 * Avoid "school" / "PTO" — Hey Ralli serves multiple organization types.
 */

export interface OrganizationWelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface OrganizationWelcomeEmailInput {
  /** Confirmation / magic-link URL (or `{{ .ConfirmationURL }}` for Supabase). */
  actionUrl: string;
  /** Recipient email (or `{{ .Email }}` for Supabase). */
  email: string;
  /** Optional site origin for footer links. */
  siteUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function gmailPrimaryFilterUrl(): string {
  return "https://heyralli.com/go/email-primary";
}

/**
 * Welcome email when someone creates a new Hey Ralli organization account
 * (founding / magic-link signup).
 */
export function buildOrganizationWelcomeEmail(
  input: OrganizationWelcomeEmailInput,
): OrganizationWelcomeEmailContent {
  const email = input.email.trim() || "your email";
  const actionUrl = input.actionUrl.trim();
  const emailPrimaryUrl = gmailPrimaryFilterUrl();
  const subject = "Welcome to Hey Ralli — create your organization";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ebe4d9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe4d9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#f6f2eb;border:1px solid #ddd4c8;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#2a2622;padding:22px 32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#f6f2eb;letter-spacing:0.02em;">Hey Ralli</p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a89f94;letter-spacing:0.08em;text-transform:uppercase;">Welcome</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#2a2622;">
              <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:#2a2622;">Create your organization</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#5c554c;">
                You’re one step away from your Hey Ralli workspace — campaigns, approvals, and publishing for your organization.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#5c554c;">
                Open the secure link below with <strong style="color:#2a2622;">${escapeHtml(email)}</strong> to continue setup.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;">
              <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2a2622;color:#f6f2eb;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:14px;font-weight:600;">
                Let's get started
              </a>
              <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#5c554c;">
                This link expires soon. If you didn’t request it, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 22px;border-top:1px solid #ddd4c8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5c554c;">
              Sent by Hey Ralli
              &nbsp;·&nbsp;
              <a href="${escapeHtml(emailPrimaryUrl)}" style="color:#5c554c;">Keep mail in Primary</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    "Hey Ralli — Welcome",
    "",
    "Create your organization",
    "",
    "You’re one step away from your Hey Ralli workspace — campaigns, approvals, and publishing for your organization.",
    "",
    `Continue with: ${email}`,
    "",
    "Let's get started:",
    actionUrl,
    "",
    "This link expires soon. If you didn’t request it, ignore this email.",
    "",
    "— Hey Ralli",
  ].join("\n");

  return { subject, html, text };
}

/** Supabase Auth Magic Link body (Go template variables). */
export function buildSupabaseMagicLinkEmailHtml(): string {
  return buildOrganizationWelcomeEmail({
    actionUrl: "{{ .ConfirmationURL }}",
    email: "{{ .Email }}",
  }).html;
}

export function organizationWelcomeEmailSubject(): string {
  return "Welcome to Hey Ralli — create your organization";
}
