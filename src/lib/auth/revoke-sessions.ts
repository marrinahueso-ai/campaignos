import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/**
 * Force-logs-out a user by deleting their `auth.sessions` rows (cascades to
 * `auth.refresh_tokens`) via `public.revoke_user_sessions` (service-role
 * only RPC). Call this right after deactivating/removing a membership so a
 * kicked-out member can't keep refreshing their session indefinitely —
 * RLS (`is_active_org_member`) already blocks their org data access, but the
 * underlying Supabase session otherwise stays alive until it naturally
 * expires. Best-effort: logs and swallows errors so a revoke failure never
 * blocks the deactivation itself from succeeding.
 */
export async function revokeUserSessions(userId: string | null | undefined): Promise<void> {
  if (!userId || !isSupabaseAdminConfigured()) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("revoke_user_sessions", {
      p_user_id: userId,
    });
    if (error) {
      console.error("[revoke-sessions] failed:", error.message);
    }
  } catch (err) {
    console.error("[revoke-sessions] threw:", err);
  }
}

/**
 * Same as {@link revokeUserSessions}, but only if the user has no other
 * *active* membership left in a different organization — a multi-org user
 * being deactivated/removed from org A should keep their session alive for
 * org B rather than getting logged out everywhere.
 */
export async function revokeUserSessionsIfNoActiveMembership(
  userId: string | null | undefined,
): Promise<void> {
  if (!userId || !isSupabaseAdminConfigured()) return;

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("organization_users")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      console.error("[revoke-sessions] active-membership check failed:", error.message);
      return;
    }

    if ((count ?? 0) > 0) return;

    await revokeUserSessions(userId);
  } catch (err) {
    console.error("[revoke-sessions] active-membership check threw:", err);
  }
}
