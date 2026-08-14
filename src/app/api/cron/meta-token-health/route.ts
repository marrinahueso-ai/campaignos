import { NextResponse } from "next/server";
import { backfillMetaApprovalRequests } from "@/lib/event-workspace/meta-approval-sync";
import {
  sendPendingApprovalReminders,
  sendTrialEndingNotices,
} from "@/lib/email/transactional-notification-jobs";
import { refreshAllMetaConnectionHealth } from "@/lib/meta-publishing/connection-token-health";
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

  const [result, backfillOutcome, approvalReminders, trialEndingNotices] = await Promise.all([
    refreshAllMetaConnectionHealth(),
    // Write-owned sync path: keep meta milestone approval requests in sync
    // without running this on every dashboard layout GET. Runs with the
    // service-role client (useServiceRole: true) — a cron invocation has no
    // user session, and the normal RLS-bound client would silently see zero
    // rows for every org instead of actually reconciling them. See
    // docs/ops/cron-jobs.md for the full explanation.
    backfillMetaApprovalRequests(null, null, true)
      .then((count) => ({ count, error: null as string | null }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Meta approval backfill during token-health cron failed:", message);
        // Surface the failure explicitly instead of a bare `0`, which is
        // indistinguishable from "ran fine, nothing needed reconciling"
        // (e.g. a missing SUPABASE_SERVICE_ROLE_KEY must not look healthy).
        return { count: 0, error: message };
      }),
    sendPendingApprovalReminders(),
    sendTrialEndingNotices(),
  ]);

  return NextResponse.json({
    ok: true,
    organizationsProcessed: result.organizationsProcessed,
    invalidTokens: result.results.filter((entry) => entry.reconnectRequired).length,
    approvalRequestsBackfilled: backfillOutcome.count,
    approvalBackfillError: backfillOutcome.error,
    approvalReminders,
    trialEndingNotices,
    results: result.results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
