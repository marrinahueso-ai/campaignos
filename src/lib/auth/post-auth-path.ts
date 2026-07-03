import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveOrganizationMembership } from "@/lib/auth/membership-queries";
import {
  getPendingFoundingAccessCode,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const SCHOOL_SETUP_PATH = "/settings/school-setup";
export const DEFAULT_AUTH_PATH = "/dashboard";

export function resolveAuthenticatedAppPath(
  hasOrganization: boolean,
  next?: string | null,
  options?: { pendingSetup?: boolean },
): string {
  if (options?.pendingSetup) {
    return SCHOOL_SETUP_PATH;
  }

  if (!hasOrganization) {
    return SCHOOL_SETUP_PATH;
  }

  return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
}

export async function getAuthenticatedAppPath(
  next?: string | null,
): Promise<string> {
  const pendingCode = await getPendingFoundingAccessCode();
  const pendingSetup =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);

  if (pendingSetup) {
    const organization = await getCurrentOrganization();
    if (organization) {
      return DEFAULT_AUTH_PATH;
    }
    return SCHOOL_SETUP_PATH;
  }

  const organization = await getCurrentOrganization();
  return resolveAuthenticatedAppPath(organization !== null, next);
}

/** For route handlers and middleware that already have a Supabase client. */
export async function resolvePostAuthPathForUser(
  supabase: SupabaseClient,
  userId: string,
  next?: string | null,
  options?: { setupIntent?: boolean },
): Promise<string> {
  const pendingCode = options?.setupIntent
    ? (await getPendingFoundingAccessCode())
    : null;
  const hasValidPendingSetup =
    Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);

  const hasMembership = await hasActiveOrganizationMembership(supabase, userId);

  if (hasValidPendingSetup) {
    if (hasMembership) {
      return "/login?error=existing_org";
    }
    return SCHOOL_SETUP_PATH;
  }

  if (options?.setupIntent && !hasValidPendingSetup) {
    return "/login?intent=setup&error=code_required";
  }

  if (hasMembership === null) {
    return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
  }

  return resolveAuthenticatedAppPath(hasMembership, next);
}
