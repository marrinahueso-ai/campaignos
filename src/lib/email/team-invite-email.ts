function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
}

export function buildTeamInviteEmail(
  input: TeamInviteEmailInput,
): TeamInviteEmailContent {
  const greetingName = input.inviteeName?.trim() || "there";
  const org = input.organizationName.trim() || "your PTO";
  const message = input.personalMessage?.trim() || null;
  const inviter = input.inviterEmail?.trim() || null;

  const subject = `You're invited to ${org} on Hey Ralli`;

  const textLines = [
    `Hi ${greetingName},`,
    "",
    `You've been invited to join ${org} on Hey Ralli as ${input.accessLevelLabel}.`,
    inviter ? `Invited by: ${inviter}` : null,
    message ? `\nMessage from your team:\n${message}` : null,
    "",
    `Accept your invite:\n${input.inviteUrl}`,
    "",
    "Sign in with the same email address this invite was sent to.",
    "",
    "— Hey Ralli",
  ].filter((line): line is string => line !== null);

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; color: #1c1917; line-height: 1.5;">
  <p>Hi ${escapeHtml(greetingName)},</p>
  <p>You've been invited to join <strong>${escapeHtml(org)}</strong> on Hey Ralli as <strong>${escapeHtml(input.accessLevelLabel)}</strong>.</p>
  ${inviter ? `<p style="color:#78716c;font-size:14px;">Invited by ${escapeHtml(inviter)}</p>` : ""}
  ${
    message
      ? `<p style="padding:12px 16px;background:#f5f5f4;border-left:3px solid #a8a29e;">${escapeHtml(message)}</p>`
      : ""
  }
  <p><a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;padding:10px 16px;background:#1c1917;color:#fafaf9;text-decoration:none;">Accept invite</a></p>
  <p style="font-size:13px;color:#78716c;">Or copy this link:<br/>${escapeHtml(input.inviteUrl)}</p>
  <p style="font-size:13px;color:#78716c;">Sign in with the same email address this invite was sent to.</p>
  <p>— Hey Ralli</p>
</body>
</html>`;

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
