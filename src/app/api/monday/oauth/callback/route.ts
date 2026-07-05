import { NextResponse, type NextRequest } from "next/server";
import {
  MONDAY_OAUTH_REDIRECT_URI_COOKIE,
  MONDAY_OAUTH_RETURN_COOKIE,
  MONDAY_OAUTH_STATE_COOKIE,
  getMondayOAuthCookieOptions,
  getMondayRedirectUri,
  isMondayIntegrationConfigured,
  resolveMondayOAuthOrigin,
} from "@/lib/monday/config";
import {
  exchangeMondayAuthorizationCode,
  parseMondayOAuthState,
  saveMondayConnectionFromTokenResponse,
} from "@/lib/monday/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function GET(request: NextRequest) {
  const origin = resolveMondayOAuthOrigin(request.nextUrl.origin);
  const fallbackReturn = "/settings/monday";

  if (!isMondayIntegrationConfigured()) {
    const url = new URL(fallbackReturn, origin);
    url.searchParams.set("error", "not_configured");
    return clearOAuthCookies(NextResponse.redirect(url), origin);
  }

  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const parsedState = parseMondayOAuthState(state);
  const returnToCookie = request.cookies.get(MONDAY_OAUTH_RETURN_COOKIE)?.value;
  const returnTo =
    (parsedState.valid && parsedState.returnTo) ||
    (returnToCookie && returnToCookie.startsWith("/") && !returnToCookie.startsWith("//")
      ? returnToCookie
      : fallbackReturn);

  const redirectTarget = new URL(returnTo, origin);

  if (error) {
    console.error(
      "Monday OAuth provider error:",
      error,
      errorDescription ?? "(no description)",
      request.nextUrl.search,
    );
    redirectTarget.searchParams.set("error", error);
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  if (!code || !state) {
    console.error("Monday OAuth callback missing code or state:", request.nextUrl.search);
    redirectTarget.searchParams.set("error", "missing_code");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  if (!parsedState.valid) {
    const expectedState = request.cookies.get(MONDAY_OAUTH_STATE_COOKIE)?.value;
    if (!expectedState || state !== expectedState) {
      console.error("Monday OAuth state mismatch:", {
        hasCookie: Boolean(expectedState),
        stateLength: state.length,
      });
      redirectTarget.searchParams.set("error", "invalid_state");
      return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
    }
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    console.error("Monday OAuth callback: no organization for authenticated user");
    redirectTarget.searchParams.set("error", "no_organization");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const redirectUri =
    (parsedState.valid && parsedState.redirectUri) ||
    request.cookies.get(MONDAY_OAUTH_REDIRECT_URI_COOKIE)?.value ||
    getMondayRedirectUri(origin);

  const tokenResult = await exchangeMondayAuthorizationCode({
    code,
    redirectUri,
  });

  if (!tokenResult.ok) {
    console.error("Monday OAuth token exchange failed for redirect_uri:", redirectUri);
    redirectTarget.searchParams.set("error", tokenResult.error);
    if (tokenResult.errorDescription) {
      redirectTarget.searchParams.set("error_description", tokenResult.errorDescription);
    }
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const saved = await saveMondayConnectionFromTokenResponse(
    organization.id,
    tokenResult.token,
  );
  if (!saved) {
    redirectTarget.searchParams.set("error", "save_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  redirectTarget.searchParams.set("connected", "1");
  return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
}

function clearOAuthCookies(response: NextResponse, origin: string): NextResponse {
  const cookieOptions = getMondayOAuthCookieOptions(origin);
  response.cookies.set(MONDAY_OAUTH_STATE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(MONDAY_OAUTH_RETURN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(MONDAY_OAUTH_REDIRECT_URI_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
