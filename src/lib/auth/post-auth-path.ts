import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACCOUNT_DEACTIVATED_LOGIN_PATH,
} from "@/lib/auth/membership-access";
import { getOrganizationAccessState } from "@/lib/auth/membership-queries";
import {
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const SCHOOL_SETUP_PATH = "/settings/school-setup";
/** Value-first first-time onboarding (Welcome → create event). */
export const ONBOARDING_PATH = "/onboarding";
export const DEFAULT_AUTH_PATH = "/dashboard";

/** Known login errors with dedicated UI copy. */
export const LOGIN_PAGE_ERRORS = [
  "existing_org",
  "auth",
  "code_required",
  "org_required",
  "invite_email",
  "account_deactivated",
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

/** Any /login?error=… URL must render without middleware or page redirects. */
export function shouldAllowAuthenticatedLoginView(error?: string | null) {
  return Boolean(error?.trim());
}

export function resolveAuthenticatedAppPath(
  hasOrganization: boolean,
  next?: string | null,
  options?: { pendingSetup?: boolean },
): string {
  if (options?.pendingSetup) {
    return ONBOARDING_PATH;
  }

  if (!hasOrganization) {
    return ONBOARDING_PATH;
  }

  return safeNextPath(next) ?? DEFAULT_AUTH_PATH;
}

export async function getAuthenticatedAppPath(
  next?: string | null,
  options?: { setupIntent?: boolean },
): Promise<string> {
  const setupIntent = options?.setupIntent ?? false;

  if (setupIntent) {
    const pendingCode = await getPendingFoundingAccessCode();
    const pendingSetup =
      Boolean(pendingCode) && validateFoundingAccessCode(pendingCode);

    if (pendingSetup) {
      const organization = await getCurrentOrganization();
      if (organization) {
        return "/login?error=existing_org";
      }
      return ONBOARDING_PATH;
    }

    if (isFoundingAccessCodeRequired()) {
      return "/login?intent=setup&error=code_required";
    }
  }

  const organization = await getCurrentOrganization();
  if (organization) {
    return resolveAuthenticatedAppPath(true, next);
  }

  const user = await getAuthUser();
  if (user) {
    const supabase = await createClient();
    const accessState = await getOrganizationAccessState(supabase, user.id);
    if (accessState === "deactivated") {
      return ACCOUNT_DEACTIVATED_LOGIN_PATH;
    }
  }

  return resolveAuthenticatedAppPath(false, next);
}

/** For route handlers and middleware that already have a Supabase client. */
export async function resolvePostAuthPathForUser(
  supabase: SupabaseClient,
  userId: string,
  next?: string | null,
  options?: {
    setupIntent?: boolean;
    pendingCode?: string | null;
    /** Keep invitees on the invite login path instead of founding/school setup. */
    inviteToken?: string | null;
  },
): Promise<string> {
  const setupIntent = options?.setupIntent ?? false;
  const inviteToken = options?.inviteToken?.trim() || null;
  const pendingCode = setupIntent
    ? options?.pendingCode !== undefined
      ? options.pendingCode
      : await getPendingFoundingAccessCode()
    : null;
  const hasValidPendingSetup =
    setupIntent &&
    Boolean(pendingCode) &&
    validateFoundingAccessCode(pendingCode);

  const accessState = await getOrganizationAccessState(supabase, userId);
  const hasMembership = accessState === "active";

  if (hasValidPendingSetup) {
    if (hasMembership) {
      return "/login?error=existing_org";
    }
    // Deactivated members must not enter founding / school-setup via setup intent.
    if (accessState === "deactivated") {
      return ACCOUNT_DEACTIVATED_LOGIN_PATH;
    }
    return ONBOARDING_PATH;
  }

  if (setupIntent && !hasValidPendingSetup) {
    return "/login?intent=setup&error=code_required";
  }

  if (!hasMembership) {
    if (accessState === "deactivated") {
      return ACCOUNT_DEACTIVATED_LOGIN_PATH;
    }
    // Invited teammates must not fall into new-school / founding-access UX.
    if (inviteToken) {
      const params = new URLSearchParams({
        invite: inviteToken,
        error: "invite_email",
      });
      return `/login?${params.toString()}`;
    }
    return ONBOARDING_PATH;
  }

  return resolveAuthenticatedAppPath(true, next);
}
