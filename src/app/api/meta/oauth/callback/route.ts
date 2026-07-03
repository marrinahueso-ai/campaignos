import { NextResponse, type NextRequest } from "next/server";
import {
  META_OAUTH_PAGE_ID_COOKIE,
  META_OAUTH_RETURN_COOKIE,
  META_OAUTH_STATE_COOKIE,
} from "@/lib/meta-publishing/config";
import {
  getMetaFacebookPageId,
  getMetaOAuthCookieOptions,
  getMetaRedirectUri,
  isMetaIntegrationConfigured,
  parseMetaOAuthState,
} from "@/lib/meta-publishing/config.server";
import { saveMetaConnectionFromOAuth } from "@/lib/meta-publishing/connection-actions";
import {
  debugToken,
  exchangeCodeForUserToken,
  exchangeShortLivedForLongLived,
  fetchPagesFromUserToken,
  mergeResolvedMetaPages,
} from "@/lib/meta-publishing/graph-api";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fallbackReturn = "/settings/meta";

  if (!isMetaIntegrationConfigured()) {
    const url = new URL(fallbackReturn, origin);
    url.searchParams.set("error", "not_configured");
    return clearOAuthCookies(NextResponse.redirect(url), origin);
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const returnToCookie = request.cookies.get(META_OAUTH_RETURN_COOKIE)?.value;
  const returnTo =
    returnToCookie && returnToCookie.startsWith("/") && !returnToCookie.startsWith("//")
      ? returnToCookie
      : fallbackReturn;

  const redirectTarget = new URL(returnTo, origin);

  if (error) {
    redirectTarget.searchParams.set("error", error);
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  if (!code || !state) {
    redirectTarget.searchParams.set("error", "missing_code");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const cookieState = request.cookies.get(META_OAUTH_STATE_COOKIE)?.value;
  const stateMatchesCookie = Boolean(cookieState && state === cookieState);
  const parsedState = parseMetaOAuthState(state);
  if (!stateMatchesCookie && !parsedState.valid) {
    redirectTarget.searchParams.set("error", "invalid_state");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    redirectTarget.searchParams.set("error", "no_organization");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const redirectUri = getMetaRedirectUri(origin);
  const shortLived = await exchangeCodeForUserToken({ code, redirectUri });
  if (!shortLived.accessToken) {
    redirectTarget.searchParams.set("error", "token_exchange_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const preferredPageId =
    request.cookies.get(META_OAUTH_PAGE_ID_COOKIE)?.value?.trim() ||
    parsedState.pageId ||
    request.nextUrl.searchParams.get("pageId")?.trim() ||
    request.nextUrl.searchParams.get("page_id")?.trim() ||
    getMetaFacebookPageId() ||
    undefined;

  const fallbackPageIds = preferredPageId ? [preferredPageId] : undefined;

  const shortLivedDebug = await debugToken({ inputToken: shortLived.accessToken });
  const isPageScopedToken = shortLivedDebug.tokenType?.toUpperCase() === "PAGE";

  // Resolve pages on the short-lived token first — granular page scopes often survive
  // here but are lost after the long-lived exchange on Business Suite Pages.
  const shortLivedResultPromise = fetchPagesFromUserToken(shortLived.accessToken, {
    fallbackPageIds,
  });
  const longLivedExchangePromise = isPageScopedToken
    ? Promise.resolve({ accessToken: null, expiresIn: null, error: null })
    : exchangeShortLivedForLongLived({ shortLivedToken: shortLived.accessToken });

  const [shortLivedResult, longLived] = await Promise.all([
    shortLivedResultPromise,
    longLivedExchangePromise,
  ]);

  let pages = shortLivedResult.pages;
  let pagesError = shortLivedResult.error;
  let debugHint = shortLivedResult.debugHint;
  let tokenExpiresAt: string | null = null;

  if (longLived.accessToken) {
    if (longLived.expiresIn != null) {
      tokenExpiresAt = new Date(Date.now() + longLived.expiresIn * 1000).toISOString();
    }

    const longLivedResult = await fetchPagesFromUserToken(longLived.accessToken, {
      fallbackPageIds,
      alternateTokens: [shortLived.accessToken],
      preferAlternateFirst: pages.length === 0,
    });

    pages = mergeResolvedMetaPages(pages, longLivedResult.pages);
    if (pages.length === 0) {
      pagesError = longLivedResult.error ?? shortLivedResult.error;
      debugHint = longLivedResult.debugHint ?? shortLivedResult.debugHint;
    } else {
      pagesError = null;
      debugHint = shortLivedResult.debugHint ?? longLivedResult.debugHint;
    }
  } else if (isPageScopedToken && shortLivedDebug.expiresAt) {
    tokenExpiresAt = shortLivedDebug.expiresAt;
  }

  if (pagesError || pages.length === 0) {
    console.error("Meta OAuth callback: no pages resolved", {
      pagesError,
      debugHint,
      preferredPageId,
      tokenValid: shortLivedDebug.isValid,
      scopes: shortLivedDebug.scopes,
      granularPageIds: shortLivedDebug.granularPageIds,
      granularInstagramIds: shortLivedDebug.granularInstagramIds,
      profileId: shortLivedDebug.profileId,
      tokenType: shortLivedDebug.tokenType,
      userId: shortLivedDebug.userId,
      debugError: shortLivedDebug.error,
      isPageScopedToken,
      shortLivedSources: shortLivedResult.debugHint,
    });
    redirectTarget.searchParams.set("error", "no_pages");
    if (debugHint) {
      redirectTarget.searchParams.set("hint", debugHint.slice(0, 480));
    }
    if (shortLivedDebug.scopes.length > 0) {
      redirectTarget.searchParams.set(
        "scopes",
        shortLivedDebug.scopes.join(",").slice(0, 200),
      );
    }
    if (shortLivedDebug.granularPageIds.length > 0) {
      redirectTarget.searchParams.set(
        "pages",
        shortLivedDebug.granularPageIds.join(",").slice(0, 120),
      );
    }
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  const saved = await saveMetaConnectionFromOAuth({
    organizationId: organization.id,
    pages,
    preferredPageId: preferredPageId || undefined,
    tokenExpiresAt,
  });

  if (!saved.success) {
    redirectTarget.searchParams.set("error", saved.errorCode ?? "save_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
  }

  redirectTarget.searchParams.set("connected", "1");
  return clearOAuthCookies(NextResponse.redirect(redirectTarget), origin);
}

function clearOAuthCookies(response: NextResponse, origin: string): NextResponse {
  const cookieOptions = getMetaOAuthCookieOptions(origin);
  for (const name of [
    META_OAUTH_STATE_COOKIE,
    META_OAUTH_RETURN_COOKIE,
    META_OAUTH_PAGE_ID_COOKIE,
  ]) {
    response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
  return response;
}
