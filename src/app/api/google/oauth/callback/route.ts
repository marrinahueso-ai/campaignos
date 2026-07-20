import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_OAUTH_RETURN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  getGoogleRedirectUri,
  isGoogleCalendarIntegrationConfigured,
} from "@/lib/google-calendar/config";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleAccountEmail,
  getGoogleCalendarConnectionForOrganization,
  saveGoogleCalendarConnectionFromTokenResponse,
} from "@/lib/google-calendar/connection";
import { syncSchoolYearGoogleCalendar } from "@/lib/google-calendar/sync";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import { resolveSiteOrigin } from "@/lib/site/url";

export async function GET(request: NextRequest) {
  const origin = resolveSiteOrigin(request.nextUrl.origin);
  const fallbackReturn = "/settings/integrations/calendar";

  if (!isGoogleCalendarIntegrationConfigured()) {
    const url = new URL(fallbackReturn, origin);
    url.searchParams.set("error", "not_configured");
    return clearOAuthCookies(NextResponse.redirect(url));
  }

  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const returnTo = safeOAuthReturnTo(
    request.cookies.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value,
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

  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || state !== expectedState) {
    redirectTarget.searchParams.set("error", "invalid_state");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    redirectTarget.searchParams.set("error", "no_organization");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const previous = await getGoogleCalendarConnectionForOrganization(
    organization.id,
  );

  const token = await exchangeGoogleAuthorizationCode({
    code,
    redirectUri: getGoogleRedirectUri(origin),
  });

  if (!token) {
    redirectTarget.searchParams.set("error", "token_exchange_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const email = await fetchGoogleAccountEmail(token.access_token);
  const saved = await saveGoogleCalendarConnectionFromTokenResponse(
    organization.id,
    token,
    {
      googleAccountEmail: email,
      previousRefreshToken: previous?.refreshToken,
    },
  );

  if (!saved) {
    redirectTarget.searchParams.set("error", "save_failed");
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  const connection = await getGoogleCalendarConnectionForOrganization(
    organization.id,
  );
  const schoolYear = await getActiveSchoolYear(organization.id);

  if (connection && schoolYear) {
    const syncResult = await syncSchoolYearGoogleCalendar({
      organizationId: organization.id,
      organizationSchoolYear: organization.schoolYear ?? null,
      schoolYear,
      connection,
      autoImport: false,
    });

    if (syncResult.success && syncResult.importId && syncResult.added > 0) {
      const reviewUrl = new URL("/calendar/review", origin);
      reviewUrl.searchParams.set("import", syncResult.importId);
      reviewUrl.searchParams.set("connected", "1");
      return clearOAuthCookies(NextResponse.redirect(reviewUrl));
    }

    if (syncResult.success) {
      redirectTarget.searchParams.set("connected", "1");
      redirectTarget.searchParams.set("synced", "1");
      if (syncResult.skipped > 0) {
        redirectTarget.searchParams.set(
          "skipped",
          String(syncResult.skipped),
        );
      }
      return clearOAuthCookies(NextResponse.redirect(redirectTarget));
    }

    redirectTarget.searchParams.set("connected", "1");
    redirectTarget.searchParams.set(
      "sync_error",
      syncResult.error ?? "sync_failed",
    );
    return clearOAuthCookies(NextResponse.redirect(redirectTarget));
  }

  redirectTarget.searchParams.set("connected", "1");
  if (!schoolYear) {
    redirectTarget.searchParams.set("needs_school_year", "1");
  }
  return clearOAuthCookies(NextResponse.redirect(redirectTarget));
}

function clearOAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  response.cookies.delete(GOOGLE_OAUTH_RETURN_COOKIE);
  return response;
}
