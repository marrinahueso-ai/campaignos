import { NextResponse } from "next/server";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_meta_connections")
    .select("organization_id");

  if (error || !data) {
    return NextResponse.json({ error: "Could not load Meta connections." }, { status: 500 });
  }

  const results = [];
  for (const row of data) {
    const organizationId = row.organization_id as string;
    const result = await syncOrganizationInsights({ organizationId });
    results.push({ organizationId, ...result });
  }

  return NextResponse.json({
    ok: true,
    organizationsProcessed: results.length,
    results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
