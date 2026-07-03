import { NextResponse, type NextRequest } from "next/server";
import {
  META_OAUTH_AUTHORIZE_URL,
  META_OAUTH_RETURN_COOKIE,
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
} from "@/lib/meta-publishing/config";
import {
  createMetaOAuthState,
  getMetaAppId,
  getMetaRedirectUri,
  isMetaIntegrationConfigured,
} from "@/lib/meta-publishing/config.server";

export async function GET(request: NextRequest) {
  if (!isMetaIntegrationConfigured()) {
    const settingsUrl = new URL("/settings/meta", request.nextUrl.origin);
    settingsUrl.searchParams.set("error", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/settings/meta";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/meta";

  const state = createMetaOAuthState();
  const redirectUri = getMetaRedirectUri(request.nextUrl.origin);

  const authorizeUrl = new URL(META_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", getMetaAppId());
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", META_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };

  response.cookies.set(META_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(META_OAUTH_RETURN_COOKIE, safeReturnTo, cookieOptions);

  return response;
}
