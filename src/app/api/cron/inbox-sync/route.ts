import { NextResponse } from "next/server";
import { syncAllOrganizationsInbox } from "@/lib/inbox/sync/sync-organization";

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

  const result = await syncAllOrganizationsInbox();

  return NextResponse.json({
    ok: true,
    organizationsProcessed: result.organizationsProcessed,
    results: result.results.map((entry) => ({
      organizationId: entry.organizationId,
      ok: entry.result.ok,
      threadsUpserted: entry.result.threadsUpserted,
      messagesUpserted: entry.result.messagesUpserted,
      error: entry.result.error,
    })),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
