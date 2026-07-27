import "server-only";

import { cache } from "react";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/**
 * Auth `last_sign_in_at` for users who already have a membership row in this
 * organization. Uses the service-role admin API (`getUserById`) — never
 * listUsers — and only looks up the provided member user ids.
 *
 * Returns a map keyed by auth user id → ISO timestamp or null when the user
 * exists but has never signed in. Missing keys mean lookup was skipped/failed.
 */
export const getOrganizationMemberLastSignIns = cache(
  async (
    organizationId: string,
    memberUserIds: Array<string | null | undefined>,
  ): Promise<Record<string, string | null>> => {
    const orgId = organizationId.trim();
    if (!orgId || !isSupabaseAdminConfigured()) {
      return {};
    }

    const uniqueIds = Array.from(
      new Set(
        memberUserIds
          .map((id) => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (uniqueIds.length === 0) {
      return {};
    }

    // Belt-and-suspenders: only return last_sign_in for users who still have
    // an organization_users row in this org (callers should already scope).
    const admin = createAdminClient();
    const { data: membershipRows, error: membershipError } = await admin
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", orgId)
      .in("user_id", uniqueIds);

    if (membershipError) {
      console.error(
        "[last-sign-in] org membership scope failed:",
        membershipError.message,
      );
      return {};
    }

    const allowedIds = Array.from(
      new Set(
        (membershipRows ?? [])
          .map((row) =>
            typeof row.user_id === "string" ? row.user_id.trim() : "",
          )
          .filter(Boolean),
      ),
    );
    if (allowedIds.length === 0) {
      return {};
    }

    const result: Record<string, string | null> = {};
    const chunkSize = 8;
    for (let i = 0; i < allowedIds.length; i += chunkSize) {
      const chunk = allowedIds.slice(i, i + chunkSize);
      const settled = await Promise.all(
        chunk.map(async (userId) => {
          try {
            const { data, error } = await admin.auth.admin.getUserById(userId);
            if (error || !data.user) {
              return { userId, lastSignInAt: null as string | null, ok: false };
            }
            return {
              userId,
              lastSignInAt: data.user.last_sign_in_at ?? null,
              ok: true,
            };
          } catch (err) {
            console.error("[last-sign-in] getUserById failed:", err);
            return { userId, lastSignInAt: null as string | null, ok: false };
          }
        }),
      );
      for (const entry of settled) {
        if (entry.ok) {
          result[entry.userId] = entry.lastSignInAt;
        }
      }
    }

    return result;
  },
);
