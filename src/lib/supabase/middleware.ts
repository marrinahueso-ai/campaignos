import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { hasActiveOrganizationMembership } from "@/lib/auth/membership-queries";
import { resolveOrgGateRedirect } from "@/lib/auth/org-gate";
import {
  resolvePostAuthPathForUser,
  shouldAllowAuthenticatedLoginView,
} from "@/lib/auth/post-auth-path";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/pricing",
  "/features",
  "/login",
  "/auth/callback",
  "/auth/signout",
  "/api/cron",
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
    if (shouldAllowAuthenticatedLoginView(request.nextUrl.searchParams.get("error"))) {
      return supabaseResponse;
    }

    const pendingCode = getPendingFoundingAccessCodeFromRequest(request);
    const hasValidPendingCode =
      Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);
    const hasMembership = await hasActiveOrganizationMembership(
      supabase,
      user.id,
    );

    if (
      !hasMembership &&
      isFoundingAccessCodeRequired() &&
      !hasValidPendingCode
    ) {
      return supabaseResponse;
    }

    const homePath = await resolvePostAuthPathForUser(supabase, user.id);
    if (shouldAllowAuthenticatedLoginView(new URL(homePath, request.url).searchParams.get("error"))) {
      return supabaseResponse;
    }
    const homeUrl = new URL(homePath, request.nextUrl.origin);
    const redirectResponse = NextResponse.redirect(homeUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && !isPublicPath(pathname)) {
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
