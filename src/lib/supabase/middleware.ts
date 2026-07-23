import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getOrganizationAccessState } from "@/lib/auth/membership-queries";
import { resolveOrgGateRedirect } from "@/lib/auth/org-gate";
import {
  resolvePostAuthPathForUser,
  shouldAllowAuthenticatedLoginView,
} from "@/lib/auth/post-auth-path";
import {
  DEVELOPER_AGREEMENTS_PATH,
  userMustSignDeveloperAgreements,
} from "@/lib/developer-agreements/gate";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/pricing",
  "/features",
  "/login",
  "/invite",
  "/auth/callback",
  "/auth/signout",
  "/robots.txt",
  "/sitemap.xml",
  "/api/cron",
  "/api/sentry-verify",
  "/dev/sentry-verify",
  "/dev/motion-engine",
  "/api/monday/oauth/callback",
  "/api/canva/oauth/callback",
  "/api/meta/oauth/callback",
  "/api/google/oauth/callback",
  "/api/meta/webhook",
  "/go/instagram-post",
  "/go/email-primary",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const loginError = request.nextUrl.searchParams.get("error");
    if (shouldAllowAuthenticatedLoginView(loginError)) {
      return supabaseResponse;
    }

    const setupIntent = request.nextUrl.searchParams.get("intent") === "setup";
    const pendingCode = setupIntent
      ? getPendingFoundingAccessCodeFromRequest(request)
      : null;
    const hasValidPendingCode =
      Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
    const accessState = await getOrganizationAccessState(supabase, user.id);
    const hasMembership = accessState === "active";

    // Deactivated members must resolve to the deactivated login state, not
    // founding-access / school-setup entry.
    if (accessState === "deactivated") {
      const homePath = await resolvePostAuthPathForUser(
        supabase,
        user.id,
        null,
        { setupIntent, pendingCode },
      );
      if (
        shouldAllowAuthenticatedLoginView(
          new URL(homePath, request.url).searchParams.get("error"),
        )
      ) {
        const deactivatedUrl = new URL(homePath, request.nextUrl.origin);
        if (
          request.nextUrl.pathname !== deactivatedUrl.pathname ||
          request.nextUrl.search !== deactivatedUrl.search
        ) {
          const redirectResponse = NextResponse.redirect(deactivatedUrl);
          copyCookies(supabaseResponse, redirectResponse);
          return redirectResponse;
        }
        return supabaseResponse;
      }
    }

    if (
      !hasMembership &&
      accessState !== "deactivated" &&
      isFoundingAccessCodeRequired() &&
      !hasValidPendingCode
    ) {
      return supabaseResponse;
    }

    const homePath = await resolvePostAuthPathForUser(supabase, user.id, null, {
      setupIntent,
      pendingCode,
    });
    if (
      shouldAllowAuthenticatedLoginView(
        new URL(homePath, request.url).searchParams.get("error"),
      )
    ) {
      return supabaseResponse;
    }
    const homeUrl = new URL(homePath, request.nextUrl.origin);
    const redirectResponse = NextResponse.redirect(homeUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user) {
    const mustChangePassword =
      user.app_metadata?.must_change_password === true;
    if (mustChangePassword && pathname !== "/account/change-password") {
      const changeUrl = new URL("/account/change-password", request.nextUrl.origin);
      const redirectResponse = NextResponse.redirect(changeUrl);
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    // After password gate: developers must sign required agreements before app access.
    // Skip public paths (marketing + /dev/* harnesses) so logged-in sessions can still
    // open local tooling without completing agreements first.
    if (
      !mustChangePassword &&
      pathname !== "/account/change-password" &&
      !pathname.startsWith(DEVELOPER_AGREEMENTS_PATH) &&
      !isPublicPath(pathname)
    ) {
      const mustSign = await userMustSignDeveloperAgreements(supabase, user.id);
      if (mustSign) {
        const agreementsUrl = new URL(
          DEVELOPER_AGREEMENTS_PATH,
          request.nextUrl.origin,
        );
        const redirectResponse = NextResponse.redirect(agreementsUrl);
        copyCookies(supabaseResponse, redirectResponse);
        return redirectResponse;
      }
    }
  }

  if (
    user &&
    !isPublicPath(pathname) &&
    pathname !== "/account/change-password" &&
    !pathname.startsWith(DEVELOPER_AGREEMENTS_PATH)
  ) {
    const gateRedirect = await resolveOrgGateRedirect(request, supabase, user.id);
    if (gateRedirect) {
      const gateUrl = new URL(gateRedirect, request.nextUrl.origin);
      const redirectResponse = NextResponse.redirect(gateUrl);
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
