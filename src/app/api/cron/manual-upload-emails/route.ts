import { NextResponse } from "next/server";
import { sendDueManualUploadEmails } from "@/lib/approvals-scheduling/send-due-manual-upload-emails";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueManualUploadEmails();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
