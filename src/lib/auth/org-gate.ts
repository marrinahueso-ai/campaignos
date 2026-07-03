import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { hasActiveOrganizationMembership } from "@/lib/auth/membership-queries";
import { SCHOOL_SETUP_PATH } from "@/lib/auth/post-auth-path";

const ORG_SETUP_PATHS = ["/settings/school-setup", "/school-setup"];

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

  const hasMembership = await hasActiveOrganizationMembership(supabase, userId);
  if (hasMembership) {
    return null;
  }

  const pendingCode = getPendingFoundingAccessCodeFromRequest(request);
  const hasValidPendingCode =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);

  if (hasValidPendingCode) {
    return isOrgSetupPath(pathname) ? null : SCHOOL_SETUP_PATH;
  }

  if (isOrgSetupPath(pathname) || pathname === "/login") {
    return null;
  }

  return "/login?intent=setup&error=org_required";
}
