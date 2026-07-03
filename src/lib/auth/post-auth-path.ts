import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveOrganizationMembership } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const SCHOOL_SETUP_PATH = "/settings/school-setup";
export const DEFAULT_AUTH_PATH = "/dashboard";

export function resolveAuthenticatedAppPath(
  hasOrganization: boolean,
  next?: string | null,
): string {
  if (!hasOrganization) {
    return SCHOOL_SETUP_PATH;
  }

  return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
}

export async function getAuthenticatedAppPath(
  next?: string | null,
): Promise<string> {
  const organization = await getCurrentOrganization();
  return resolveAuthenticatedAppPath(organization !== null, next);
}

/** For route handlers and middleware that already have a Supabase client. */
export async function resolvePostAuthPathForUser(
  supabase: SupabaseClient,
  userId: string,
  next?: string | null,
): Promise<string> {
  const hasMembership = await hasActiveOrganizationMembership(supabase, userId);

  if (hasMembership === null) {
    return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
  }

  return resolveAuthenticatedAppPath(hasMembership, next);
}
