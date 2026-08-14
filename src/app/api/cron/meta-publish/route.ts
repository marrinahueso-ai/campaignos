import { NextResponse } from "next/server";
import { reconcileOrphanScheduledApprovals } from "@/lib/approvals-scheduling/publish-outcome-sync";
import { publishDueMetaMilestones } from "@/lib/meta-publishing/publish-due";
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

  const result = await publishDueMetaMilestones();
  const orphanReconcile = await reconcileOrphanScheduledApprovals();

  return NextResponse.json({
    ok: true,
    ...result,
    orphanReconcile,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
