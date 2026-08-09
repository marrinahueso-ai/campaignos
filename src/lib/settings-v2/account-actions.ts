"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import {
  checkRateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  accountEraseRequiresPassword,
  isValidAccountEraseConfirmation,
  lastWorkspaceAdminEraseError,
} from "@/lib/settings-v2/erase-account";
import {
  normalizeAccountNotificationPreferences,
  type AccountNotificationPreferences,
} from "@/lib/settings-v2/account-notification-prefs";

export type AccountProfileFormState = {
  error: string | null;
  success: boolean;
};

export type AccountEraseFormState = {
  error: string | null;
  success: boolean;
};

export async function updateAccountProfileAction(
  _prev: AccountProfileFormState,
  formData: FormData,
): Promise<AccountProfileFormState> {
  const membership = await getActiveMembership();
  const user = await getAuthUser();
  if (!membership || !user) {
    return { error: "Not signed in.", success: false };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    return { error: "Display name is required.", success: false };
  }

  const supabase = await createClient();
  const { error: membershipError } = await supabase
    .from("organization_users")
    .update({ display_name: displayName })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (membershipError) {
    console.error(
      "[settings/account] failed to save display name:",
      membershipError.message,
    );
    return { error: "Could not save your profile.", success: false };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: displayName,
      display_name: displayName,
      name: displayName,
    },
  });

  if (authError) {
    console.error(
      "[settings/account] failed to sync auth display name:",
      authError.message,
    );
  }

  revalidatePath("/settings/account");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function saveAccountNotificationPreferencesAction(
  prefs: AccountNotificationPreferences,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeAccountNotificationPreferences(prefs);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ notification_preferences: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error(
      "[settings/account] failed to save notification prefs:",
      error.message,
    );
    return { success: false, error: "Could not save notification preferences." };
  }

  revalidatePath("/settings/account");
  return { success: true };
}

/**
 * Permanently erase the signed-in Auth user and their membership rows.
 * Requires typing DELETE (+ password when the account has an email identity).
 * Blocks when the caller is the last admin/president on any active workspace.
 */
export async function eraseAccountAction(
  _prev: AccountEraseFormState,
  formData: FormData,
): Promise<AccountEraseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { error: "Not signed in.", success: false };
  }

  const eraseRateLimit = await checkRateLimit({
    key: `erase-account:${user.id}`,
    windowSeconds: 60 * 60,
    max: 5,
  });
  if (!eraseRateLimit.allowed) {
    return {
      error: rateLimitMessage(eraseRateLimit.retryAfterSeconds, "attempts"),
      success: false,
    };
  }

  const confirmation = String(formData.get("confirmation") ?? "");
  if (!isValidAccountEraseConfirmation(confirmation)) {
    return {
      error: 'Type DELETE in all caps to confirm account erase.',
      success: false,
    };
  }

  const requiresPassword = accountEraseRequiresPassword(user.identities);
  if (requiresPassword) {
    const password = String(formData.get("password") ?? "");
    if (!password) {
      return { error: "Enter your password to confirm.", success: false };
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (reauthError) {
      return { error: "Password is incorrect.", success: false };
    }
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Account erase is temporarily unavailable. Try again later.",
      success: false,
    };
  }

  const admin = createAdminClient();
  const { data: membershipRows, error: membershipError } = await admin
    .from("organization_users")
    .select("id, organization_id, campaign_role, status")
    .eq("user_id", user.id);

  if (membershipError) {
    console.error(
      "[settings/account] erase membership load failed:",
      membershipError.message,
    );
    return {
      error: "Could not verify workspace access before erase.",
      success: false,
    };
  }

  const memberships = (membershipRows ?? []).map((row) => ({
    organizationId: String(row.organization_id),
    campaignRole: row.campaign_role as CampaignRole,
    status: String(row.status),
  }));

  const manageOrgIds = [
    ...new Set(
      memberships
        .filter(
          (membership) =>
            membership.status === "active" &&
            canManageTeam(membership.campaignRole),
        )
        .map((membership) => membership.organizationId),
    ),
  ];

  const otherManageCountsByOrg: Record<string, number> = {};
  for (const organizationId of manageOrgIds) {
    const { count, error: countError } = await admin
      .from("organization_users")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("campaign_role", ["admin", "president"])
      .neq("user_id", user.id);

    if (countError) {
      console.error(
        "[settings/account] erase last-admin check failed:",
        countError.message,
      );
      return {
        error: "Could not verify workspace admins before erase.",
        success: false,
      };
    }

    otherManageCountsByOrg[organizationId] = count ?? 0;
  }

  const lastAdminError = lastWorkspaceAdminEraseError(
    memberships,
    otherManageCountsByOrg,
  );
  if (lastAdminError) {
    return { error: lastAdminError, success: false };
  }

  const { error: deleteMembershipsError } = await admin
    .from("organization_users")
    .delete()
    .eq("user_id", user.id);

  if (deleteMembershipsError) {
    console.error(
      "[settings/account] erase membership delete failed:",
      deleteMembershipsError.message,
    );
    return {
      error: "Could not remove your workspace memberships.",
      success: false,
    };
  }

  // Clear any leftover invited rows keyed only by email for this person.
  const { error: deleteEmailRowsError } = await admin
    .from("organization_users")
    .delete()
    .ilike("email", user.email);

  if (deleteEmailRowsError) {
    console.error(
      "[settings/account] erase email membership cleanup failed:",
      deleteEmailRowsError.message,
    );
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error(
      "[settings/account] erase auth user failed:",
      deleteUserError.message,
    );
    return {
      error: "Could not erase your account. Contact support if this continues.",
      success: false,
    };
  }

  try {
    const { clearActiveOrganizationPreference } = await import(
      "@/lib/auth/active-organization-actions"
    );
    await clearActiveOrganizationPreference();
  } catch {
    // Best-effort tenant cookie cleanup.
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // Auth user may already be gone; still send them to login.
  }

  redirect("/login?notice=account_erased");
}
