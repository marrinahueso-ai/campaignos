#!/usr/bin/env node
/**
 * Create (or report) the Hey Ralli newsletter Resend webhook.
 *
 * Requires a FULL-ACCESS Resend API key (not a send-only key).
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx node --env-file=.env.local scripts/create-newsletter-resend-webhook.mjs
 *
 * Optional:
 *   NEWSLETTER_WEBHOOK_URL=https://heyralli.com/api/newsletter/webhooks/resend
 *
 * Prints the signing secret once — store it as RESEND_WEBHOOK_SECRET.
 */

import { Resend } from "resend";

const DEFAULT_ENDPOINT =
  "https://heyralli.com/api/newsletter/webhooks/resend";

const EVENTS = [
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.failed",
];

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("RESEND_API_KEY is required (full-access key, not send-only).");
    process.exit(1);
  }

  const endpoint =
    process.env.NEWSLETTER_WEBHOOK_URL?.trim() || DEFAULT_ENDPOINT;
  const resend = new Resend(apiKey);

  const existing = await resend.webhooks.list();
  if (existing.error) {
    console.error("Could not list webhooks:", existing.error.message);
    if (/restricted_api_key/i.test(existing.error.message)) {
      console.error(
        "\nYour RESEND_API_KEY is send-only. Create a full-access key in the Resend dashboard, then re-run.",
      );
    }
    process.exit(1);
  }

  const rows = existing.data?.data ?? [];
  const already = rows.find((row) => row.endpoint === endpoint);
  if (already) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          alreadyExists: true,
          id: already.id,
          endpoint: already.endpoint,
          events: already.events,
          note: "Signing secret is only shown at create time. Rotate/recreate in Resend if you need a new RESEND_WEBHOOK_SECRET.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const created = await resend.webhooks.create({
    endpoint,
    events: EVENTS,
  });

  if (created.error || !created.data) {
    console.error("Failed to create webhook:", created.error?.message);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: true,
        id: created.data.id,
        endpoint: created.data.endpoint,
        events: created.data.events,
        signing_secret: created.data.signing_secret,
        nextSteps: [
          "Set RESEND_WEBHOOK_SECRET to signing_secret in Vercel + .env.local",
          "Keep using your send-only key for RESEND_API_KEY if preferred",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
