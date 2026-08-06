import { NextResponse } from "next/server";
import { reconcileOrphanScheduledApprovals } from "@/lib/approvals-scheduling/publish-outcome-sync";
import { publishDueMetaMilestones } from "@/lib/meta-publishing/publish-due";

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
