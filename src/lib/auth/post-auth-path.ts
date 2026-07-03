import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveOrganizationMembership } from "@/lib/auth/membership-queries";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const SCHOOL_SETUP_PATH = "/settings/school-setup";
export const DEFAULT_AUTH_PATH = "/dashboard";

/** Login errors that must render for authenticated users (no auto-redirect). */
export const LOGIN_PAGE_ERRORS = [
  "existing_org",
  "auth",
  "code_required",
  "org_required",
] as const;

export type LoginPageError = (typeof LOGIN_PAGE_ERRORS)[number];

export function isLoginPageError(
  error: string | null | undefined,
): error is LoginPageError {
  return (
    error !== null &&
    error !== undefined &&
    (LOGIN_PAGE_ERRORS as readonly string[]).includes(error)
  );
}

export function shouldAllowAuthenticatedLoginView(error?: string | null) {
  return isLoginPageError(error);
}

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
      return "/login?error=existing_org";
    }
    return SCHOOL_SETUP_PATH;
  }

  const organization = await getCurrentOrganization();
  if (!organization && isFoundingAccessCodeRequired() && !pendingSetup) {
    return "/login?intent=setup&error=code_required";
  }

  return resolveAuthenticatedAppPath(organization !== null, next);
}

/** For route handlers and middleware that already have a Supabase client. */
export async function resolvePostAuthPathForUser(
  supabase: SupabaseClient,
  userId: string,
  next?: string | null,
  options?: { setupIntent?: boolean; pendingCode?: string | null },
): Promise<string> {
  const pendingCode =
    options?.pendingCode ?? (await getPendingFoundingAccessCode());
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

  if (!hasMembership) {
    return SCHOOL_SETUP_PATH;
  }

  return resolveAuthenticatedAppPath(true, next);
}
