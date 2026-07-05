import { NextResponse, type NextRequest } from "next/server";
import {
  MONDAY_OAUTH_RETURN_COOKIE,
  MONDAY_OAUTH_STATE_COOKIE,
  getMondayRedirectUri,
  isMondayIntegrationConfigured,
} from "@/lib/monday/config";
import {
  exchangeMondayAuthorizationCode,
  saveMondayConnectionFromTokenResponse,
} from "@/lib/monday/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fallbackReturn = "/settings/monday";

  if (!isMondayIntegrationConfigured()) {
    const url = new URL(fallbackReturn, origin);
    url.searchParams.set("error", "not_configured");
    return clearOAuthCookies(NextResponse.redirect(url));
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const returnToCookie = request.cookies.get(MONDAY_OAUTH_RETURN_COOKIE)?.value;
  const returnTo =
    returnToCookie && returnToCookie.startsWith("/") && !returnToCookie.startsWith("//")
      ? returnToCookie
      : fallbackReturn;

  const redirectTarget = new URL(returnTo, origin);

  if (error) {
    redirectTarget.searchParams.set("error", error);
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  if (!code || !state) {
    redirectTarget.searchParams.set("error", "missing_code");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const expectedState = request.cookies.get(MONDAY_OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || state !== expectedState) {
    redirectTarget.searchParams.set("error", "invalid_state");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    redirectTarget.searchParams.set("error", "no_organization");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const token = await exchangeMondayAuthorizationCode({
    code,
    redirectUri: getMondayRedirectUri(origin),
  });

  if (!token) {
    redirectTarget.searchParams.set("error", "token_exchange_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const saved = await saveMondayConnectionFromTokenResponse(organization.id, token);
  if (!saved) {
    redirectTarget.searchParams.set("error", "save_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  redirectTarget.searchParams.set("connected", "1");
  return clearOAuthCookies(NextResponse.redirect(redirectTarget));
}

function clearOAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(MONDAY_OAUTH_STATE_COOKIE);
  response.cookies.delete(MONDAY_OAUTH_RETURN_COOKIE);
  return response;
}
