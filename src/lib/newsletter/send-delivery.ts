import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/email/send";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import { mapSendRow } from "@/lib/newsletter/queries";
import { formatFromHeader } from "@/lib/newsletter/sender";
import type {
  Newsletter,
  NewsletterAudienceEligibleContact,
  NewsletterSend,
  NewsletterSendRow,
  NewsletterSenderProfile,
  NewsletterVersion,
} from "@/lib/newsletter/types";
import { buildUnsubscribeUrl, createUnsubscribeToken } from "@/lib/newsletter/unsubscribe";

const RECIPIENT_BATCH_SIZE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function sendToRecipient(
  contact: NewsletterAudienceEligibleContact,
  input: { newsletter: Newsletter; version: NewsletterVersion; senderProfile: NewsletterSenderProfile },
  sendId: string,
): Promise<{
  contact: NewsletterAudienceEligibleContact;
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const tokenResult = await createUnsubscribeToken({
    contactId: contact.contactId,
    organizationId: input.newsletter.organizationId,
    sendId,
  });
  if (!tokenResult.ok) {
    return { contact, success: false, error: tokenResult.error };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(tokenResult.rawToken);
  const html = input.version.renderedHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

  const result = await sendEmail({
    to: [contact.email],
    subject: input.newsletter.subject,
    html,
    from: formatFromHeader(input.senderProfile),
    replyTo: input.newsletter.replyToEmail.trim() || undefined,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    idempotencyKey: `newsletter-send/${sendId}/${contact.contactId}`,
  });

  return { contact, success: result.success, messageId: result.id, error: result.error };
}

export interface DeliverNewsletterSendInput {
  /** Caller-scoped client (user session for interactive sends, admin for cron/webhook). */
  supabase: SupabaseClient;
  sendId: string;
  newsletter: Newsletter;
  version: NewsletterVersion;
  senderProfile: NewsletterSenderProfile;
  contacts: NewsletterAudienceEligibleContact[];
  actorUserId?: string | null;
}

/**
 * Shared "actually send the emails" step used by both Send Now and the
 * scheduled-send executor. Assumes the `newsletter_sends` row is already
 * created/claimed with status `sending` (single-flight already established
 * by the caller — either the idempotency-key upsert in `send-now.ts` or the
 * `claim_newsletter_scheduled_send` RPC in `schedule.ts`).
 */
export async function deliverNewsletterSend(
  input: DeliverNewsletterSendInput,
): Promise<NewsletterSend> {
  const { supabase } = input;

  let deliveredCount = 0;
  let failedCount = 0;
  const providerMessageIds: string[] = [];

  for (const batch of chunk(input.contacts, RECIPIENT_BATCH_SIZE)) {
    const results = await Promise.all(
      batch.map((contact) =>
        sendToRecipient(
          contact,
          { newsletter: input.newsletter, version: input.version, senderProfile: input.senderProfile },
          input.sendId,
        ),
      ),
    );

    const recipientRows = results.map((result) => ({
      organization_id: input.newsletter.organizationId,
      send_id: input.sendId,
      contact_id: result.contact.contactId,
      email: result.contact.email,
      email_normalized: result.contact.emailNormalized,
      status: result.success ? ("sent" as const) : ("failed" as const),
      provider_message_id: result.messageId ?? null,
      error_message: result.error ?? null,
      sent_at: result.success ? new Date().toISOString() : null,
    }));

    await supabase
      .from("newsletter_send_recipients")
      .upsert(recipientRows, { onConflict: "send_id,email_normalized" });

    for (const result of results) {
      if (result.success) {
        deliveredCount += 1;
        if (result.messageId) providerMessageIds.push(result.messageId);
      } else {
        failedCount += 1;
      }
    }
  }

  const completedAt = new Date().toISOString();
  const finalStatus = deliveredCount > 0 ? "sent" : "failed";
  const failureReason = finalStatus === "failed" ? "All recipient sends failed." : null;

  const { data: finalSendRow } = await supabase
    .from("newsletter_sends")
    .update({
      status: finalStatus,
      completed_at: completedAt,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      provider_batch_ids: providerMessageIds,
      failure_reason: failureReason,
      updated_at: completedAt,
    })
    .eq("id", input.sendId)
    .select("*")
    .maybeSingle();

  await supabase
    .from("newsletters")
    .update({
      status: finalStatus,
      sent_at: finalStatus === "sent" ? completedAt : input.newsletter.sentAt,
      sent_by: finalStatus === "sent" ? (input.actorUserId ?? null) : input.newsletter.sentBy,
      last_failure_reason: failureReason,
      updated_at: completedAt,
    })
    .eq("id", input.newsletter.id);

  await logNewsletterAuditEvent({
    organizationId: input.newsletter.organizationId,
    newsletterId: input.newsletter.id,
    actorUserId: input.actorUserId,
    eventType: finalStatus === "sent" ? "send_completed" : "send_failed",
    detail: { sendId: input.sendId, deliveredCount, failedCount },
  });

  if (finalSendRow) {
    return mapSendRow(finalSendRow as NewsletterSendRow);
  }

  // Extremely unlikely (row existed a moment ago) — synthesize from known facts.
  return {
    id: input.sendId,
    organizationId: input.newsletter.organizationId,
    newsletterId: input.newsletter.id,
    versionId: input.version.id,
    audienceId: null,
    sendKind: "production",
    status: finalStatus,
    idempotencyKey: "",
    scheduledFor: null,
    startedAt: null,
    completedAt,
    selectedCount: input.contacts.length,
    excludedCount: 0,
    eligibleCount: input.contacts.length,
    deliveredCount,
    failedCount,
    fromDisplayName: input.newsletter.fromDisplayName,
    fromEmail: input.newsletter.fromEmail,
    replyToEmail: input.newsletter.replyToEmail,
    subject: input.newsletter.subject,
    renderedHtml: input.version.renderedHtml,
    provider: "resend",
    providerBatchIds: providerMessageIds,
    failureReason,
    createdBy: input.actorUserId ?? null,
    createdAt: completedAt,
    updatedAt: completedAt,
  };
}
