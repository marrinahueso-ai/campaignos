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

  if (mode === "subscribe" && token && challenge && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature({ rawBody, signatureHeader: signature })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await processMetaWebhookPayload(payload);

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    skipped: result.skipped,
  });
}
