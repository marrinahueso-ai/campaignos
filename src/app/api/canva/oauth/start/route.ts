import { NextResponse, type NextRequest } from "next/server";
import {
  CANVA_AUTHORIZE_URL,
  CANVA_OAUTH_RETURN_COOKIE,
  CANVA_OAUTH_STATE_COOKIE,
  CANVA_OAUTH_VERIFIER_COOKIE,
  CANVA_OAUTH_SCOPES,
  getCanvaClientId,
  getCanvaRedirectUri,
  isCanvaIntegrationConfigured,
} from "@/lib/canva/config";
import { createCanvaCodeChallenge, createCanvaCodeVerifier, createCanvaOAuthState } from "@/lib/canva/pkce";
import { resolveSiteOrigin } from "@/lib/site/url";

export async function GET(request: NextRequest) {
  const siteOrigin = resolveSiteOrigin(request.nextUrl.origin);

  if (!isCanvaIntegrationConfigured()) {
    const settingsUrl = new URL("/settings/canva", siteOrigin);
    settingsUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/settings/canva";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/canva";

  const codeVerifier = createCanvaCodeVerifier();
  const codeChallenge = createCanvaCodeChallenge(codeVerifier);
  const state = createCanvaOAuthState();
  const redirectUri = getCanvaRedirectUri(siteOrigin);

  const authorizeUrl = new URL(CANVA_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("scope", CANVA_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getCanvaClientId());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };

  response.cookies.set(CANVA_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(CANVA_OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOptions);
  response.cookies.set(CANVA_OAUTH_RETURN_COOKIE, safeReturnTo, cookieOptions);

  return response;
}
