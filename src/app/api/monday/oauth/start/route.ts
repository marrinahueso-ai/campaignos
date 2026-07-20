import { NextResponse, type NextRequest } from "next/server";
import {
  MONDAY_AUTHORIZE_URL,
  MONDAY_OAUTH_REDIRECT_URI_COOKIE,
  MONDAY_OAUTH_RETURN_COOKIE,
  MONDAY_OAUTH_SCOPES,
  MONDAY_OAUTH_STATE_COOKIE,
  getMondayClientId,
  getMondayOAuthCookieOptions,
  getMondayRedirectUri,
  hasMondayClientId,
  isMondayIntegrationConfigured,
  resolveMondayOAuthOrigin,
} from "@/lib/monday/config";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
import { createMondayOAuthState } from "@/lib/monday/connection";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = resolveMondayOAuthOrigin(request.nextUrl.origin);

  if (!isMondayIntegrationEnabled()) {
    const settingsUrl = new URL("/settings/monday", origin);
    settingsUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  if (!hasMondayClientId()) {
    const settingsUrl = new URL("/settings/monday", origin);
    settingsUrl.searchParams.set("error", "missing_client_id");
    return NextResponse.redirect(settingsUrl);
  }

  if (!isMondayIntegrationConfigured()) {
    const settingsUrl = new URL("/settings/monday", origin);
    settingsUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const safeReturnTo = safeOAuthReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
    "/settings/monday",
  );

  const redirectUri = getMondayRedirectUri(origin);
  const state = createMondayOAuthState(safeReturnTo, redirectUri);

  const authorizeUrl = new URL(MONDAY_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", getMondayClientId());
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", MONDAY_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("force_install_if_needed", "true");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = getMondayOAuthCookieOptions(origin);

  response.cookies.set(MONDAY_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(MONDAY_OAUTH_RETURN_COOKIE, safeReturnTo, cookieOptions);
  response.cookies.set(MONDAY_OAUTH_REDIRECT_URI_COOKIE, redirectUri, cookieOptions);

  return response;
}
