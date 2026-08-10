import { NextResponse } from "next/server";

import {
  handleNewsletterResendWebhookEvent,
  verifyResendWebhookSignature,
  type ResendNewsletterWebhookPayload,
} from "@/lib/newsletter/webhook-resend";

export const dynamic = "force-dynamic";

function requiresWebhookSignature(): boolean {
  if (process.env.RESEND_WEBHOOK_SECRET?.trim()) return true;
  // Fail closed in deployed environments — unsigned newsletter webhooks must
  // not be accepted once the endpoint is public.
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  return vercelEnv === "production" || vercelEnv === "preview";
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (requiresWebhookSignature()) {
    if (!secret) {
      console.error(
        "Newsletter Resend webhook rejected: RESEND_WEBHOOK_SECRET is not configured.",
      );
      return NextResponse.json(
        { error: "Webhook signing secret is not configured." },
        { status: 503 },
      );
    }
    const verified = verifyResendWebhookSignature({
      secret,
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
      rawBody,
    });
    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: ResendNewsletterWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ResendNewsletterWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await handleNewsletterResendWebhookEvent(payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, skipped: result.skipped ?? false });
}
