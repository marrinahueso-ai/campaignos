export interface TeamInviteEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface TeamInviteEmailInput {
  organizationName: string;
  inviteeName: string | null;
  inviteeEmail: string;
  accessLevelLabel: string;
  inviteUrl: string;
  personalMessage: string | null;
  inviterEmail: string | null;
  /** When set (testing mode), shown so invitees can use Email & password first. */
  temporaryPassword?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Production Hey Ralli origin for invite email deep links. */
function gmailPrimaryFilterUrl(): string {
  return "https://heyralli.com/go/email-primary";
}

/**
 * Professional Hey Ralli template for Team & Access login invites.
 * Sent via Resend from notifications@heyralli.com (RESEND_FROM_EMAIL).
 */
export function buildTeamInviteEmail(
  input: TeamInviteEmailInput,
): TeamInviteEmailContent {
  const greetingName = input.inviteeName?.trim() || "there";
  const org = input.organizationName.trim() || "your PTO";
  const roleLabel = input.accessLevelLabel.trim() || "team member";
  const message = input.personalMessage?.trim() || null;
  const inviter = input.inviterEmail?.trim() || null;
  const temporaryPassword = input.temporaryPassword?.trim() || null;
  const emailPrimaryUrl = gmailPrimaryFilterUrl();

  const subject = `You're invited to ${org} on Hey Ralli`;

  const messageBlock = message
    ? `<tr>
        <td style="padding:0 32px 20px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">Message from your team</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffcf7" style="background-color:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;font-size:15px;line-height:1.55;color:#2a2622;white-space:pre-wrap;">${escapeHtml(message)}</td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const credentialsBlock = temporaryPassword
    ? `<tr>
        <td style="padding:0 32px 20px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">Your sign-in details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffcf7" style="background-color:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#5c554c;">Email</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.4;font-weight:600;color:#2a2622;">${escapeHtml(input.inviteeEmail)}</p>
                <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#5c554c;">Temporary password</p>
                <p style="margin:0 0 12px;font-size:18px;line-height:1.4;font-weight:700;letter-spacing:0.04em;color:#2a2622;font-family:Consolas,Monaco,monospace;">${escapeHtml(temporaryPassword)}</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#5c554c;">Use Email &amp; password on your first sign-in. After that you can use Google if you prefer.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const signInHelp = temporaryPassword
    ? `Open the invite link, then sign in with <strong style="color:#2a2622;">Email &amp; password</strong> using the temporary password below.`
    : `Accept the invite, then sign in with <strong style="color:#2a2622;">${escapeHtml(input.inviteeEmail)}</strong> — the same email this invite was sent to.`;

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
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a89f94;letter-spacing:0.08em;text-transform:uppercase;">Team invite</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#2a2622;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c554c;">${escapeHtml(org)}</p>
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:#2a2622;">You're invited to join the team</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#2a2622;">
                Hi ${escapeHtml(greetingName)}, you've been invited to join
                <strong>${escapeHtml(org)}</strong> on Hey Ralli.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">Your role</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#2a2622;">${escapeHtml(roleLabel)}</p>
                    ${
                      inviter
                        ? `<p style="margin:8px 0 0;font-size:13px;color:#5c554c;">Invited by ${escapeHtml(inviter)}</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#5c554c;">
                ${signInHelp}
              </p>
            </td>
          </tr>
          ${credentialsBlock}
          ${messageBlock}
          <tr>
            <td style="padding:0 32px 12px;font-family:Arial,Helvetica,sans-serif;">
              <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#2a2622;color:#f6f2eb;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:14px;font-weight:600;">
                Accept invite
              </a>
              <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#5c554c;word-break:break-all;">
                Or copy this link:<br />
                <a href="${escapeHtml(input.inviteUrl)}" style="color:#5c554c;">${escapeHtml(input.inviteUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-family:Arial,Helvetica,sans-serif;">
              <a href="${escapeHtml(emailPrimaryUrl)}" style="display:inline-block;background:#e8dfd2;color:#2a2622;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:600;">
                Keep Hey Ralli in Primary
              </a>
              <p style="margin:10px 0 0;font-size:12px;line-height:1.45;color:#5c554c;">
                One-time Gmail setup so invites, approvals, and reminders stay in Primary — not Promotions.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 22px;border-top:1px solid #ddd4c8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5c554c;">
              Sent by Hey Ralli · Team access invite
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textLines = [
    "Hey Ralli — Team invite",
    "",
    `Hi ${greetingName},`,
    "",
    `You've been invited to join ${org} on Hey Ralli as ${roleLabel}.`,
    inviter ? `Invited by: ${inviter}` : null,
    `Sign in with: ${input.inviteeEmail}`,
    temporaryPassword
      ? `Temporary password: ${temporaryPassword}\n(Use Email & password on first sign-in. After that you can use Google if you prefer.)`
      : null,
    message ? `\nMessage from your team:\n${message}` : null,
    "",
    "Accept your invite:",
    input.inviteUrl,
    "",
    "Keep Hey Ralli mail in Primary:",
    emailPrimaryUrl,
    "",
    "— Hey Ralli",
  ].filter((line): line is string => line !== null);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
