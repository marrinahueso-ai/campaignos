import { NextResponse } from "next/server";

import {
  handleNewsletterResendWebhookEvent,
  verifyResendWebhookSignature,
  type ResendNewsletterWebhookPayload,
} from "@/lib/newsletter/webhook-resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
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
