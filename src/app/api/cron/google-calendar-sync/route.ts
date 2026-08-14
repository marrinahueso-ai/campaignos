import { NextResponse } from "next/server";
import { syncAllActiveGoogleCalendars } from "@/lib/google-calendar/sync-cron";
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

  const result = await syncAllActiveGoogleCalendars();

  const imported = result.results.reduce((sum, row) => sum + row.imported, 0);
  const added = result.results.reduce((sum, row) => sum + row.added, 0);
  const skipped = result.results.reduce((sum, row) => sum + row.skipped, 0);
  const errors = result.results.filter((row) => !row.success);

  return NextResponse.json({
    ok: true,
    targetCount: result.targetCount,
    imported,
    added,
    skipped,
    errorCount: errors.length,
    results: result.results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
