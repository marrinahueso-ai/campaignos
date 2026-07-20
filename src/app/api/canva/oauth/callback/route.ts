import { NextResponse, type NextRequest } from "next/server";
import {
  CANVA_OAUTH_RETURN_COOKIE,
  CANVA_OAUTH_STATE_COOKIE,
  CANVA_OAUTH_VERIFIER_COOKIE,
  getCanvaRedirectUri,
  isCanvaIntegrationConfigured,
} from "@/lib/canva/config";
import {
  exchangeCanvaAuthorizationCode,
  saveCanvaConnectionFromTokenResponse,
} from "@/lib/canva/connection";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { resolveSiteOrigin } from "@/lib/site/url";

export async function GET(request: NextRequest) {
  const origin = resolveSiteOrigin(request.nextUrl.origin);
  const fallbackReturn = "/settings/canva";

  if (!isCanvaIntegrationConfigured()) {
    const url = new URL(fallbackReturn, origin);
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const returnTo = safeOAuthReturnTo(
    request.cookies.get(CANVA_OAUTH_RETURN_COOKIE)?.value,
    fallbackReturn,
  );

  const redirectTarget = new URL(returnTo, origin);

  if (error) {
    redirectTarget.searchParams.set("error", error);
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  if (!code || !state) {
    redirectTarget.searchParams.set("error", "missing_code");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const expectedState = request.cookies.get(CANVA_OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(CANVA_OAUTH_VERIFIER_COOKIE)?.value;

  if (!expectedState || !codeVerifier || state !== expectedState) {
    redirectTarget.searchParams.set("error", "invalid_state");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    redirectTarget.searchParams.set("error", "no_organization");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const token = await exchangeCanvaAuthorizationCode({
    code,
    codeVerifier,
    redirectUri: getCanvaRedirectUri(origin),
  });

  if (!token) {
    redirectTarget.searchParams.set("error", "token_exchange_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const saved = await saveCanvaConnectionFromTokenResponse(organization.id, token);
  if (!saved) {
    redirectTarget.searchParams.set("error", "save_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  redirectTarget.searchParams.set("connected", "1");
  return clearOAuthCookies(NextResponse.redirect(redirectTarget));
}

function clearOAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(CANVA_OAUTH_STATE_COOKIE);
  response.cookies.delete(CANVA_OAUTH_VERIFIER_COOKIE);
  response.cookies.delete(CANVA_OAUTH_RETURN_COOKIE);
  return response;
}
