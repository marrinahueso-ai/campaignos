import { NextResponse } from "next/server";
import { syncAllOrganizationsMetaTags } from "@/lib/inbox/sync/sync-organization";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
// Tags-only Graph pulls are lighter than full inbox sync, but org fan-out
// still needs headroom as connection count grows.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllOrganizationsMetaTags();

  return NextResponse.json({
    ok: true,
    organizationsProcessed: result.organizationsProcessed,
    results: result.results.map((entry) => ({
      organizationId: entry.organizationId,
      ok: entry.result.ok,
      threadsUpserted: entry.result.threadsUpserted,
      messagesUpserted: entry.result.messagesUpserted,
      error: entry.result.error,
      warnings: entry.result.warnings,
    })),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
