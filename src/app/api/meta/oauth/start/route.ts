import { NextResponse, type NextRequest } from "next/server";
import {
  META_OAUTH_AUTHORIZE_URL,
  META_OAUTH_RETURN_COOKIE,
  META_OAUTH_PAGE_ID_COOKIE,
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
} from "@/lib/meta-publishing/config";
import {
  createMetaOAuthState,
  getMetaAppId,
  getMetaFacebookPageId,
  getMetaOAuthConfigId,
  getMetaOAuthCookieOptions,
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
  const pageId =
    request.nextUrl.searchParams.get("pageId")?.trim() ||
    getMetaFacebookPageId() ||
    "";
  const authType = request.nextUrl.searchParams.get("auth_type")?.trim() ?? "";

  const state = createMetaOAuthState({ pageId: pageId || undefined });
  const redirectUri = getMetaRedirectUri(request.nextUrl.origin);
  const configId = getMetaOAuthConfigId();

  const authorizeUrl = new URL(META_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", getMetaAppId());
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  if (configId) {
    authorizeUrl.searchParams.set("config_id", configId);
  } else {
    authorizeUrl.searchParams.set("scope", META_OAUTH_SCOPES);
  }

  if (authType === "rerequest") {
    authorizeUrl.searchParams.set("auth_type", "rerequest");
  }

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = getMetaOAuthCookieOptions(request.nextUrl.origin);

  response.cookies.set(META_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(META_OAUTH_RETURN_COOKIE, safeReturnTo, cookieOptions);
  if (pageId) {
    response.cookies.set(META_OAUTH_PAGE_ID_COOKIE, pageId, cookieOptions);
  }

  return response;
}
