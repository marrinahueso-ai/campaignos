import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT_DEACTIVATED_LOGIN_PATH } from "@/lib/auth/membership-access";
import { getOrganizationAccessState } from "@/lib/auth/organization-access-state";
import { validateFoundingAccessCode } from "@/lib/auth/founding-access";
import {
  DEVELOPER_AGREEMENTS_PATH,
  userMustSignDeveloperAgreements,
} from "@/lib/developer-agreements/gate";
import {
  ONBOARDING_PATH,
  resolveAuthenticatedAppPath,
} from "@/lib/auth/post-auth-path-shared";

/**
 * Edge-safe post-auth path resolver for middleware / route handlers that
 * already have a Supabase client. Does not import next/headers.
 */
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
  const pendingCode = setupIntent ? (options?.pendingCode ?? null) : null;
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
    if (inviteToken) {
      const params = new URLSearchParams({
        invite: inviteToken,
        error: "invite_email",
      });
      return `/login?${params.toString()}`;
    }
    return ONBOARDING_PATH;
  }

  if (await userMustSignDeveloperAgreements(supabase, userId)) {
    return DEVELOPER_AGREEMENTS_PATH;
  }

  return resolveAuthenticatedAppPath(true, next);
}
