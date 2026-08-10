import "server-only";

import { sendEmail } from "@/lib/email/send";
import {
  buildComplianceFooterHtml,
  buildPhysicalAddress,
  injectComplianceFooter,
} from "@/lib/newsletter/compliance-footer";
import { exportNewsletterHtml } from "@/lib/newsletter-composer/export-html";
import { isValidEmailFormat, normalizeEmail } from "@/lib/newsletter/normalize-email";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import { getNewsletterById } from "@/lib/newsletter/queries";
import {
  formatFromHeader,
  getOrCreateSenderProfile,
  resolveAuthorizedFromAddress,
} from "@/lib/newsletter/sender";
import { getOrganizationById } from "@/lib/organizations/fetch-organization";

export interface SendNewsletterTestEmailInput {
  organizationId: string;
  newsletterId: string;
  recipientEmails: string[];
  actorUserId?: string | null;
}

export type SendNewsletterTestEmailResult =
  | { ok: true; sentTo: string[] }
  | { ok: false; error: string };

const TEST_BANNER_HTML = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
  <tr>
    <td style="background:#fff3cd;border:1px solid #ffe08a;border-radius:10px;padding:10px 14px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#7a5c00;text-align:center;">
      TEST SEND — this preview was not delivered to your audience.
    </td>
  </tr>
</table>`;

/**
 * Sends a preview to manually entered addresses only — never the audience.
 * Renders the *live* draft (not a frozen version), so it never touches
 * approval status, current/approved version pointers, or the send ledger.
 */
export async function sendNewsletterTestEmail(
  input: SendNewsletterTestEmailInput,
): Promise<SendNewsletterTestEmailResult> {
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const raw of input.recipientEmails) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeEmail(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(trimmed);
  }
  if (recipients.length === 0) {
    return { ok: false, error: "Enter at least one test recipient email address." };
  }
  const invalid = recipients.filter((email) => !isValidEmailFormat(email));
  if (invalid.length > 0) {
    return { ok: false, error: `Invalid email address: ${invalid.join(", ")}` };
  }

  const newsletter = await getNewsletterById(input.organizationId, input.newsletterId);
  if (!newsletter) {
    return { ok: false, error: "Newsletter not found." };
  }

  const [senderProfile, organization] = await Promise.all([
    getOrCreateSenderProfile(input.organizationId),
    getOrganizationById(input.organizationId),
  ]);

  const authorizedSender = resolveAuthorizedFromAddress(senderProfile, newsletter.fromEmail);
  if (!authorizedSender.ok) {
    return { ok: false, error: authorizedSender.error };
  }

  const physicalAddress = buildPhysicalAddress({
    addressLine1: organization?.addressLine1 ?? null,
    addressLine2: organization?.addressLine2 ?? null,
    city: organization?.city ?? null,
    state: organization?.state ?? null,
    postalCode: organization?.postalCode ?? null,
    country: organization?.country ?? null,
    override: senderProfile.physicalAddressOverride,
  });
  const footerHtml = buildComplianceFooterHtml({
    organizationName: organization?.name ?? newsletter.fromDisplayName,
    physicalAddress,
  });

  const bodyHtml = exportNewsletterHtml(newsletter.composerState);
  const withFooter = injectComplianceFooter(bodyHtml, footerHtml);
  // Test sends never unsubscribe a real contact — the placeholder resolves to `#`.
  const html = `${TEST_BANNER_HTML}${withFooter}`.replace(
    /\{\{UNSUBSCRIBE_URL\}\}/g,
    "#",
  );

  const subject = `[TEST] ${newsletter.subject || "(no subject)"}`;
  const replyTo = newsletter.replyToEmail.trim() || undefined;

  const result = await sendEmail({
    to: recipients,
    subject,
    html,
    from: formatFromHeader(senderProfile),
    replyTo,
  });

  if (!result.success) {
    await logNewsletterAuditEvent({
      organizationId: input.organizationId,
      newsletterId: input.newsletterId,
      actorUserId: input.actorUserId,
      eventType: "test_send",
      detail: { recipients, success: false, error: result.error },
    });
    return { ok: false, error: result.error ?? "Failed to send test email." };
  }

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: input.actorUserId,
    eventType: "test_send",
    detail: { recipients, success: true, providerMessageId: result.id },
  });

  return { ok: true, sentTo: recipients };
}
