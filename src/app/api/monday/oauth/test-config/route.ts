import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getAuthUser } from "@/lib/auth/queries";
import {
  getMondayOAuthConfigDiagnostics,
  resolveMondayOAuthOrigin,
} from "@/lib/monday/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission("manage_integrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const origin = resolveMondayOAuthOrigin(request.nextUrl.origin);
  const diagnostics = getMondayOAuthConfigDiagnostics(origin);

  return NextResponse.json({
    hasClientId: diagnostics.hasClientId,
    clientIdPrefix: diagnostics.clientIdPrefix,
    hasClientSecret: diagnostics.hasClientSecret,
    secretLength: diagnostics.secretLength,
    secretHadSurroundingQuotes: diagnostics.secretHadSurroundingQuotes,
    redirectUri: diagnostics.redirectUri,
    vercelEnv: diagnostics.vercelEnv,
    integrationConfigured: diagnostics.integrationConfigured,
  });
}
