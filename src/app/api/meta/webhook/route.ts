import { NextResponse, type NextRequest } from "next/server";
import {
  processMetaWebhookPayload,
  verifyMetaWebhookSignature,
} from "@/lib/inbox/sync/webhook-handler";

export const dynamic = "force-dynamic";

function getVerifyToken(): string | null {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (!verifyToken) {
    console.error("[inbox webhook] GET verification failed: META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Webhook verify token not configured" }, { status: 503 });
  }

  if (mode === "subscribe" && token && challenge && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("[inbox webhook] GET verification failed:", {
    mode,
    tokenMatches: token === verifyToken,
  });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature({ rawBody, signatureHeader: signature })) {
    console.error("[inbox webhook] POST rejected: invalid signature", {
      hasSignature: Boolean(signature),
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    console.error("[inbox webhook] POST rejected: invalid JSON", {
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await processMetaWebhookPayload(payload);
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      skipped: result.skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[inbox webhook] POST failed:", { message });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
