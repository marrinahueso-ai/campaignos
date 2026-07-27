"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeAccountNotificationPreferences,
  type AccountNotificationPreferences,
} from "@/lib/settings-v2/account-notification-prefs";

export type AccountProfileFormState = {
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
