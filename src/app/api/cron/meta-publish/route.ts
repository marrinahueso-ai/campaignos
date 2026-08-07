import { NextResponse } from "next/server";
import { reconcileOrphanScheduledApprovals } from "@/lib/approvals-scheduling/publish-outcome-sync";
import { publishDueMetaMilestones } from "@/lib/meta-publishing/publish-due";
import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

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
