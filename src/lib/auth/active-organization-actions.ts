"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isOrganizationId,
  normalizeOrganizationId,
} from "@/lib/auth/active-organization";
import {
  clearActiveOrganizationCookie,
  writeActiveOrganizationCookie,
} from "@/lib/auth/active-organization-cookie";
import {
  assertActiveMembershipInOrganization,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";

export type SetActiveOrganizationResult = {
  success: boolean;
  error?: string;
};

/**
 * Switch the caller's active tenant.
 *
 * Isolation: rejects unless the signed-in user has an *active* membership
 * in the target organization. Never sets a cookie for a foreign org id.
 * Redirects to /dashboard so event/pages from the previous tenant are not reused.
 */
export async function setActiveOrganizationAction(
  organizationId: string,
): Promise<SetActiveOrganizationResult> {
  const user = await getAuthUser();
  if (!user) {
    return { success: false, error: "Sign in required." };
  }

  if (!isOrganizationId(organizationId)) {
    return { success: false, error: "Invalid organization." };
  }

  const normalized = normalizeOrganizationId(organizationId);
  if (!normalized) {
    return { success: false, error: "Invalid organization." };
  }

  const allowed = await assertActiveMembershipInOrganization(normalized);
  if (!allowed) {
    return {
      success: false,
      error: "You do not have access to that organization.",
    };
  }

  await writeActiveOrganizationCookie(normalized);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Exported for sign-out — clears tenant preference with the session. */
export async function clearActiveOrganizationPreference(): Promise<void> {
  await clearActiveOrganizationCookie();
}
