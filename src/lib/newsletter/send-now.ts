import "server-only";

import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import { mapSendRow } from "@/lib/newsletter/queries";
import { deliverNewsletterSend } from "@/lib/newsletter/send-delivery";
import { validateNewsletterForSend } from "@/lib/newsletter/send-validator";
import type { NewsletterSend, NewsletterSendRow } from "@/lib/newsletter/types";
import { createClient } from "@/lib/supabase/server";

export interface SendNewsletterNowInput {
  organizationId: string;
  newsletterId: string;
  actorUserId?: string | null;
  /** Pass a pre-resolved permission check to avoid a second lookup. */
  hasSendPermission?: boolean;
  /** Caller-supplied idempotency key (e.g. a client request id) for extra double-click safety. */
  idempotencyKey?: string | null;
}

export type SendNewsletterNowResult =
  | { ok: true; send: NewsletterSend }
  | { ok: false; error: string; errors?: string[] };

/** Deterministic default so double-clicking Send Now for the same approved version never double-sends. */
function defaultIdempotencyKey(newsletterId: string, versionId: string): string {
  return `send:${newsletterId}:${versionId}`;
}

/**
 * Send Now: creates (or reuses) a durable send ledger row, calculates
 * eligible recipients fresh, sends per-recipient via Resend, and updates
 * newsletter status `sending` → `sent` / `failed`. Double-click safe via
 * the unique `(organization_id, idempotency_key)` constraint.
 */
export async function sendNewsletterNow(
  input: SendNewsletterNowInput,
): Promise<SendNewsletterNowResult> {
  const validation = await validateNewsletterForSend({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    hasSendPermission: input.hasSendPermission,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.errors[0] ?? "Unable to send.", errors: validation.errors };
  }

  const { newsletter, version, audience, eligibility, senderProfile } = validation.context;
  const idempotencyKey =
    input.idempotencyKey?.trim() || defaultIdempotencyKey(newsletter.id, version.id);

  const supabase = await createClient();

  const { data: existingRow } = await supabase
    .from("newsletter_sends")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingRow) {
    const existing = mapSendRow(existingRow as NewsletterSendRow);
    if (existing.status === "sent" || existing.status === "sending") {
      // Double-click / retry — return the existing ledger row untouched.
      return { ok: true, send: existing };
    }
  }

  const now = new Date().toISOString();
  const sendPayload = {
    organization_id: input.organizationId,
    newsletter_id: newsletter.id,
    version_id: version.id,
    audience_id: audience.id,
    send_kind: "production" as const,
    status: "sending" as const,
    idempotency_key: idempotencyKey,
    started_at: now,
    selected_count: eligibility.selected,
    excluded_count: eligibility.excluded,
    eligible_count: eligibility.eligible,
    from_display_name: newsletter.fromDisplayName,
    from_email: newsletter.fromEmail,
    reply_to_email: newsletter.replyToEmail,
    subject: newsletter.subject,
    rendered_html: version.renderedHtml,
    provider: "resend" as const,
    created_by: input.actorUserId ?? null,
    updated_at: now,
  };

  const { data: sendRow, error: sendError } = existingRow
    ? await supabase
        .from("newsletter_sends")
        .update(sendPayload)
        .eq("id", (existingRow as NewsletterSendRow).id)
        .select("*")
        .maybeSingle()
    : await supabase.from("newsletter_sends").insert(sendPayload).select("*").maybeSingle();

  if (sendError || !sendRow) {
    return { ok: false, error: sendError?.message ?? "Unable to create send record." };
  }

  const send = mapSendRow(sendRow as NewsletterSendRow);

  await supabase
    .from("newsletters")
    .update({ status: "sending", updated_at: now })
    .eq("id", newsletter.id);

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: newsletter.id,
    actorUserId: input.actorUserId,
    eventType: "send_started",
    detail: { sendId: send.id, eligibleCount: eligibility.eligible },
  });

  const finalSend = await deliverNewsletterSend({
    supabase,
    sendId: send.id,
    newsletter: { ...newsletter, status: "sending" },
    version,
    senderProfile,
    contacts: eligibility.contacts,
    actorUserId: input.actorUserId,
  });

  return { ok: true, send: finalSend };
}
