import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { suppressNewsletterContact } from "@/lib/newsletter/contacts";
import type { NewsletterSendRecipientRow } from "@/lib/newsletter/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhooks are signed the Svix way: headers `svix-id` /
 * `svix-timestamp` / `svix-signature`, secret prefixed `whsec_` (base64
 * after the prefix), signed content `${id}.${timestamp}.${rawBody}`.
 * Returns true when unconfigured (`RESEND_WEBHOOK_SECRET` unset) — callers
 * decide whether that's acceptable for their environment.
 */
export function verifyResendWebhookSignature(input: {
  secret: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  rawBody: string;
}): boolean {
  const { secret, svixId, svixTimestamp, svixSignature, rawBody } = input;
  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret,
    "base64",
  );
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest();

  return svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter((sig): sig is string => Boolean(sig))
    .some((candidate) => {
      try {
        const candidateBytes = Buffer.from(candidate, "base64");
        return (
          candidateBytes.length === expected.length &&
          timingSafeEqual(candidateBytes, expected)
        );
      } catch {
        return false;
      }
    });
}

/**
 * Minimal shape of a Resend email webhook event we care about.
 * https://resend.com/docs/dashboard/webhooks/event-types
 */
export interface ResendNewsletterWebhookPayload {
  type: string;
  data: {
    email_id?: string;
    bounce?: { type?: string } | null;
    [key: string]: unknown;
  };
}

export type HandleNewsletterWebhookResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/** Soft/transient bounces are not suppressed; anything else fails closed (suppress). */
function isHardBounce(payload: ResendNewsletterWebhookPayload): boolean {
  const bounceType = payload.data.bounce?.type?.toLowerCase();
  if (!bounceType) return true;
  return bounceType !== "transient" && bounceType !== "soft";
}

/**
 * Handles a single Resend webhook event for newsletter sends: updates the
 * recipient row status, and suppresses the contact on hard bounce or spam
 * complaint. Idempotent on `(provider, provider_event_id)` — Resend may
 * redeliver the same event, and this must never suppress/record twice.
 *
 * Uses the admin client throughout: webhooks are unauthenticated and the
 * relevant tables have no client-facing insert policy for this path.
 */
export async function handleNewsletterResendWebhookEvent(
  payload: ResendNewsletterWebhookPayload,
): Promise<HandleNewsletterWebhookResult> {
  const emailId = payload.data.email_id?.trim();
  if (!emailId) {
    return { ok: false, error: "Missing data.email_id on webhook payload." };
  }
  const eventType = payload.type;
  const providerEventId = `${eventType}:${emailId}`;

  const admin = createAdminClient();

  const { data: recipientRow } = await admin
    .from("newsletter_send_recipients")
    .select("*")
    .eq("provider_message_id", emailId)
    .maybeSingle();

  const recipient = recipientRow as NewsletterSendRecipientRow | null;

  const { error: insertError } = await admin.from("newsletter_delivery_events").insert({
    organization_id: recipient?.organization_id ?? null,
    send_id: recipient?.send_id ?? null,
    recipient_id: recipient?.id ?? null,
    provider: "resend",
    provider_event_id: providerEventId,
    event_type: eventType,
    payload: payload as unknown as Record<string, unknown>,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already recorded this exact event — idempotent no-op, do not reprocess.
      return { ok: true, skipped: true };
    }
    console.error("Failed to record newsletter delivery event:", insertError.message);
    return { ok: false, error: insertError.message };
  }

  if (!recipient) {
    // Event for a message we don't have a recipient row for (e.g. test send).
    return { ok: true };
  }

  switch (eventType) {
    case "email.delivered": {
      await admin
        .from("newsletter_send_recipients")
        .update({ status: "delivered" })
        .eq("id", recipient.id);
      break;
    }
    case "email.bounced": {
      await admin
        .from("newsletter_send_recipients")
        .update({ status: "bounced" })
        .eq("id", recipient.id);
      if (recipient.contact_id && isHardBounce(payload)) {
        await suppressNewsletterContact({
          organizationId: recipient.organization_id,
          contactId: recipient.contact_id,
          status: "bounced",
          reason: "Hard bounce reported by Resend.",
          useAdminClient: true,
        });
      }
      break;
    }
    case "email.complained": {
      await admin
        .from("newsletter_send_recipients")
        .update({ status: "complained" })
        .eq("id", recipient.id);
      if (recipient.contact_id) {
        await suppressNewsletterContact({
          organizationId: recipient.organization_id,
          contactId: recipient.contact_id,
          status: "complained",
          reason: "Spam complaint reported by Resend.",
          useAdminClient: true,
        });
      }
      break;
    }
    case "email.failed": {
      await admin
        .from("newsletter_send_recipients")
        .update({ status: "failed" })
        .eq("id", recipient.id);
      break;
    }
    default:
      break;
  }

  return { ok: true };
}
