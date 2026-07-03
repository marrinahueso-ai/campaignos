import { NextResponse } from "next/server";
import { sendStoryPostReminders } from "@/lib/meta-publishing/send-story-post-reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendStoryPostReminders();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
