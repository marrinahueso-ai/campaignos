import { NextResponse } from "next/server";
import { getInsightsPageData, buildInsightsExportRows } from "@/lib/insights/queries";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { isSameOriginRequest } from "@/lib/security/verify-same-origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CSRF: this is a cookie-authenticated route with no CSRF token, so a
  // cross-site <form>/fetch could otherwise trigger a sync using the
  // victim's session. Browsers always send Origin on cross-site requests.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

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
