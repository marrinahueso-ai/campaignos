import { NextResponse } from "next/server";

import {
  executeScheduledSend,
  listDueNewsletterScheduledSendIds,
} from "@/lib/newsletter/schedule";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueSendIds = await listDueNewsletterScheduledSendIds();
  const results = [];
  for (const sendId of dueSendIds) {
    const result = await executeScheduledSend(sendId);
    results.push({
      sendId,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function POST(request: Request) {
  return GET(request);
}
