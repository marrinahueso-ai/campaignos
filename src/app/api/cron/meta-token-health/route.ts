import { NextResponse } from "next/server";
import { backfillMetaApprovalRequests } from "@/lib/event-workspace/meta-approval-sync";
import { refreshAllMetaConnectionHealth } from "@/lib/meta-publishing/connection-token-health";

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

  const [result, backfilled] = await Promise.all([
    refreshAllMetaConnectionHealth(),
    // Write-owned sync path: keep meta milestone approval requests in sync
    // without running this on every dashboard layout GET.
    backfillMetaApprovalRequests(null).catch((error: unknown) => {
      console.error(
        "Meta approval backfill during token-health cron failed:",
        error instanceof Error ? error.message : error,
      );
      return 0;
    }),
  ]);

  return NextResponse.json({
    ok: true,
    organizationsProcessed: result.organizationsProcessed,
    invalidTokens: result.results.filter((entry) => entry.reconnectRequired).length,
    approvalRequestsBackfilled: backfilled,
    results: result.results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
