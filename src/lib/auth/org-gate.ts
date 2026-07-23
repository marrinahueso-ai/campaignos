import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { ACCOUNT_DEACTIVATED_LOGIN_PATH } from "@/lib/auth/membership-access";
import { getOrganizationAccessState } from "@/lib/auth/organization-access-state";
import {
  ONBOARDING_PATH,
  SCHOOL_SETUP_PATH,
} from "@/lib/auth/post-auth-path-shared";

const ORG_SETUP_PATHS = [
  "/onboarding",
  "/settings/school-setup",
  "/school-setup",
];

function isOrgSetupPath(pathname: string): boolean {
  return ORG_SETUP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Returns a redirect path when an authenticated user must not access app routes yet.
 * Returns null when the request may proceed.
 */
export async function resolveOrgGateRedirect(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { pathname } = request.nextUrl;

  const accessState = await getOrganizationAccessState(supabase, userId);
  if (accessState === "active") {
    return null;
  }

  if (accessState === "deactivated") {
    if (pathname === "/login" || pathname === "/account/change-password") {
      return null;
    }
    return ACCOUNT_DEACTIVATED_LOGIN_PATH;
  }

  const pendingCode = getPendingFoundingAccessCodeFromRequest(request);
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);

  if (hasValidPendingCode) {
    return isOrgSetupPath(pathname) ? null : ONBOARDING_PATH;
  }

  if (
    isOrgSetupPath(pathname) ||
    pathname === "/login" ||
    pathname.startsWith("/invite/") ||
    pathname === "/account/change-password" ||
    pathname.startsWith("/account/agreements")
  ) {
    return null;
  }

  return "/login?intent=setup&error=org_required";
}
