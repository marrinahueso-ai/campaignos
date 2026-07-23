import {
  ACCOUNT_DEACTIVATED_LOGIN_PATH,
} from "@/lib/auth/membership-access";
import { getOrganizationAccessState } from "@/lib/auth/organization-access-state";
import {
  isFoundingAccessCodeRequired,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { getPendingFoundingAccessCode } from "@/lib/auth/founding-access-server";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_AUTH_PATH,
  LOGIN_PAGE_ERRORS,
  ONBOARDING_PATH,
  SCHOOL_SETUP_PATH,
  isLoginPageError,
  resolveAuthenticatedAppPath,
  shouldAllowAuthenticatedLoginView,
  type LoginPageError,
} from "@/lib/auth/post-auth-path-shared";
import { resolvePostAuthPathForUser as resolvePostAuthPathForUserEdge } from "@/lib/auth/post-auth-path-for-user";
import type { SupabaseClient } from "@supabase/supabase-js";

export {
  DEFAULT_AUTH_PATH,
  LOGIN_PAGE_ERRORS,
  ONBOARDING_PATH,
  SCHOOL_SETUP_PATH,
  isLoginPageError,
  resolveAuthenticatedAppPath,
  shouldAllowAuthenticatedLoginView,
  type LoginPageError,
};

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
    inviteToken?: string | null;
  },
): Promise<string> {
  const setupIntent = options?.setupIntent ?? false;
  const pendingCode = setupIntent
    ? options?.pendingCode !== undefined
      ? options.pendingCode
      : await getPendingFoundingAccessCode()
    : null;

  return resolvePostAuthPathForUserEdge(supabase, userId, next, {
    ...options,
    pendingCode,
  });
}
