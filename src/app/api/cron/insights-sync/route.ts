import { NextResponse } from "next/server";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";
import { createAdminClient } from "@/lib/supabase/admin";

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
