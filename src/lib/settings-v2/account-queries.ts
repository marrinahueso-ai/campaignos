import "server-only";

import { cache } from "react";
import {
  getActiveMembership,
  listActiveMemberships,
} from "@/lib/auth/membership-queries";
import { resolveAuthUserDisplayName } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { accountEraseRequiresPassword } from "@/lib/settings-v2/erase-account";
import {
  normalizeAccountNotificationPreferences,
  type AccountNotificationPreferences,
  type SettingsEaseAccountData,
} from "@/lib/settings-v2/account-notification-prefs";

export type { SettingsEaseAccountData };

export const getSettingsEaseAccountData = cache(
  async (): Promise<SettingsEaseAccountData | null> => {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser?.email) {
      return null;
    }

    const [membership, memberships] = await Promise.all([
      getActiveMembership(),
      listActiveMemberships(),
    ]);

    if (!membership) {
      return null;
    }

    const activeOrg = memberships.find(
      (item) => item.organizationId === membership.organizationId,
    );

    const { data, error } = await supabase
      .from("organization_users")
      .select("notification_preferences, display_name")
      .eq("id", membership.user.id)
      .maybeSingle();

    if (error && error.code !== "42703") {
      console.error(
        "[settings/account] failed to load notification prefs:",
        error.message,
      );
    }

    const row = error?.code === "42703" ? null : data;
    const authDisplayName = resolveAuthUserDisplayName(authUser.user_metadata);
    const displayName =
      (typeof row?.display_name === "string" && row.display_name.trim()) ||
      membership.user.displayName?.trim() ||
      authDisplayName?.trim() ||
      "";

    return {
      displayName,
      email: authUser.email,
      workspaceName: activeOrg?.organizationName ?? "—",
      roleLabel:
        membership.user.organizationRoleName ??
        membership.user.campaignRole ??
        "—",
      notificationPreferences: normalizeAccountNotificationPreferences(
        row?.notification_preferences,
      ),
      eraseRequiresPassword: accountEraseRequiresPassword(authUser.identities),
      canChangePassword: accountEraseRequiresPassword(authUser.identities),
    };
  },
);

/** Look up quiet email prefs for a recipient (approval dispatch). */
export async function getAccountNotificationPreferencesForEmail(
  email: string,
): Promise<AccountNotificationPreferences> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return normalizeAccountNotificationPreferences({});
  }

  const { createAdminClient, isSupabaseAdminConfigured } = await import(
    "@/lib/supabase/admin"
  );
  if (!isSupabaseAdminConfigured()) {
    return normalizeAccountNotificationPreferences({});
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_users")
    .select("notification_preferences")
    .ilike("email", normalizedEmail)
    .eq("status", "active")
    .order("joined_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code !== "42703") {
      console.error(
        "[settings/account] failed to load prefs for email:",
        error.message,
      );
    }
    return normalizeAccountNotificationPreferences({});
  }

  return normalizeAccountNotificationPreferences(data?.notification_preferences);
}
