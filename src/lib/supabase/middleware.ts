import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getOrganizationAccessState } from "@/lib/auth/organization-access-state";
import { resolveOrgGateRedirect } from "@/lib/auth/org-gate";
import { resolvePostAuthPathForUser } from "@/lib/auth/post-auth-path-for-user";
import {
  shouldAllowAuthenticatedLoginView,
} from "@/lib/auth/post-auth-path-shared";
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

/** Stay well under Vercel Edge middleware's 25s hard kill. */
const AUTH_TIMEOUT_MS = 8_000;
const GATE_TIMEOUT_MS = 6_000;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.includes("auth-token") || name.endsWith("-auth-token")),
    );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
}

type TimedResult<T> = { ok: true; value: T } | { ok: false };

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<TimedResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => ({ ok: true as const, value })),
      new Promise<TimedResult<T>>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[middleware] ${label} timed out after ${ms}ms`);
          resolve({ ok: false });
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Public marketing/auth pages with no session cookie: skip Supabase entirely.
  if (isPublicPath(pathname) && !hasSupabaseAuthCookie(request)) {
    return supabaseResponse;
  }

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

  const userResult = await withTimeout(
    supabase.auth.getUser().then((result) => result.data.user),
    AUTH_TIMEOUT_MS,
    "auth.getUser",
  );

  // Timed out talking to Auth: fail open on public paths, fail closed elsewhere.
  if (!userResult.ok) {
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("error", "auth");
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  const user = userResult.value;

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
    const accessStateResult = await withTimeout(
      getOrganizationAccessState(supabase, user.id),
      GATE_TIMEOUT_MS,
      "getOrganizationAccessState",
    );
    const accessState = accessStateResult.ok ? accessStateResult.value : null;
    const hasMembership = accessState === "active";

    if (accessState === "deactivated") {
      const homePathResult = await withTimeout(
        resolvePostAuthPathForUser(supabase, user.id, null, {
          setupIntent,
          pendingCode,
        }),
        GATE_TIMEOUT_MS,
        "resolvePostAuthPathForUser",
      );
      if (
        homePathResult.ok &&
        shouldAllowAuthenticatedLoginView(
          new URL(homePathResult.value, request.url).searchParams.get("error"),
        )
      ) {
        const deactivatedUrl = new URL(
          homePathResult.value,
          request.nextUrl.origin,
        );
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

    const homePathResult = await withTimeout(
      resolvePostAuthPathForUser(supabase, user.id, null, {
        setupIntent,
        pendingCode,
      }),
      GATE_TIMEOUT_MS,
      "resolvePostAuthPathForUser",
    );
    if (!homePathResult.ok) {
      return supabaseResponse;
    }
    const homePath = homePathResult.value;
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

    if (
      !mustChangePassword &&
      pathname !== "/account/change-password" &&
      !pathname.startsWith(DEVELOPER_AGREEMENTS_PATH) &&
      !isPublicPath(pathname)
    ) {
      const mustSignResult = await withTimeout(
        userMustSignDeveloperAgreements(supabase, user.id),
        GATE_TIMEOUT_MS,
        "userMustSignDeveloperAgreements",
      );
      if (mustSignResult.ok && mustSignResult.value) {
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
    const gateRedirectResult = await withTimeout(
      resolveOrgGateRedirect(request, supabase, user.id),
      GATE_TIMEOUT_MS,
      "resolveOrgGateRedirect",
    );
    if (gateRedirectResult.ok && gateRedirectResult.value) {
      const gateUrl = new URL(gateRedirectResult.value, request.nextUrl.origin);
      const redirectResponse = NextResponse.redirect(gateUrl);
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
