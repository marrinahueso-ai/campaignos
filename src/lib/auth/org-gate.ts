import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  resolveActiveOrganizationId,
} from "@/lib/auth/active-organization";
import {
  getPendingFoundingAccessCodeFromRequest,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { ACCOUNT_DEACTIVATED_LOGIN_PATH } from "@/lib/auth/membership-access";
import {
  getOrganizationAccessState,
  getOrganizationCanceledLockout,
  resolveEdgeActiveOrganizationId,
  type EdgeMembershipSnapshot,
} from "@/lib/auth/organization-access-state";
import {
  ONBOARDING_PATH,
  SCHOOL_SETUP_PATH,
} from "@/lib/auth/post-auth-path-shared";
import { BILLING_CANCELED_PATH } from "@/lib/billing/subscription-lockout";

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
 *
 * @param membership - When the caller already fetched this user's membership
 * snapshot (e.g. middleware's shared lookup), pass it here to skip the
 * redundant `organization_users` queries. Omit to fetch live.
 */
export async function resolveOrgGateRedirect(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
  membership?: EdgeMembershipSnapshot | null,
): Promise<string | null> {
  const { pathname } = request.nextUrl;

  const accessState = membership
    ? membership.accessState
    : await getOrganizationAccessState(supabase, userId);
  if (accessState === "active") {
    if (pathname === BILLING_CANCELED_PATH) {
      return null;
    }

    // Fail open on lookup trouble — a false negative here just leaves an
    // already-canceled org visible a moment longer, a false positive would
    // wrongly lock out a paying or trialing org.
    const preferredOrganizationId =
      request.cookies.get(ACTIVE_ORGANIZATION_COOKIE)?.value ?? null;
    const activeOrganizationId = membership
      ? resolveActiveOrganizationId({
          preferredOrganizationId,
          membershipOrganizationIds: membership.activeOrganizationIds,
        })
      : await resolveEdgeActiveOrganizationId(
          supabase,
          userId,
          preferredOrganizationId,
        );
    if (activeOrganizationId) {
      const canceled = await getOrganizationCanceledLockout(
        supabase,
        activeOrganizationId,
      );
      if (canceled) {
        return BILLING_CANCELED_PATH;
      }
    }

    return null;
  }

  if (accessState === "deactivated") {
    if (
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/account/change-password" ||
      pathname === "/account/update-password"
    ) {
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
    pathname === "/signup" ||
    pathname.startsWith("/invite/") ||
    pathname === "/account/change-password" ||
    pathname === "/account/update-password" ||
    pathname.startsWith("/account/agreements") ||
    pathname === "/account/legal" ||
    pathname.startsWith("/account/legal/")
  ) {
    return null;
  }

  return "/signup?error=org_required";
}
