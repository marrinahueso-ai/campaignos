import { NextResponse } from "next/server";
import { getInsightsPageData, buildInsightsExportRows } from "@/lib/insights/queries";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";
import { getCurrentOrganization } from "@/lib/auth/organization-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 401 });
  }

  let since: string | undefined;
  let until: string | undefined;

  try {
    const body = (await request.json()) as { since?: string; until?: string };
    since = body.since;
    until = body.until;
  } catch {
    // Empty body is fine for a full sync.
  }

  const result = await syncOrganizationInsights({
    organizationId: organization.id,
    since,
    until,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
