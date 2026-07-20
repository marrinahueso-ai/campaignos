import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_CALENDAR_OAUTH_SCOPES,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_RETURN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  getGoogleClientId,
  getGoogleOAuthCookieOptions,
  getGoogleRedirectUri,
  isGoogleCalendarIntegrationConfigured,
} from "@/lib/google-calendar/config";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
import { resolveSiteOrigin } from "@/lib/site/url";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const siteOrigin = resolveSiteOrigin(request.nextUrl.origin);

  if (!isGoogleCalendarIntegrationConfigured()) {
    const settingsUrl = new URL("/settings/integrations/calendar", siteOrigin);
    settingsUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const safeReturnTo = safeOAuthReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
    "/settings/integrations/calendar",
  );

  const state = randomBytes(24).toString("hex");
  const redirectUri = getGoogleRedirectUri(siteOrigin);

  const authorizeUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", getGoogleClientId());
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", GOOGLE_CALENDAR_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("include_granted_scopes", "true");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = getGoogleOAuthCookieOptions(siteOrigin);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, safeReturnTo, cookieOptions);

  return response;
}
