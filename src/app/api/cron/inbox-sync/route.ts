import { NextResponse } from "next/server";
import { syncAllOrganizationsInbox } from "@/lib/inbox/sync/sync-organization";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
// Org-wide sweeps can take longer than the platform default as org count
// grows; give cron routes real headroom rather than risking a silent
// mid-sweep timeout that would look identical to a clean run.
export const maxDuration = 300;

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
