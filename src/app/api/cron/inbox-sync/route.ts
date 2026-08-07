import { NextResponse } from "next/server";
import { syncAllOrganizationsInbox } from "@/lib/inbox/sync/sync-organization";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
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
