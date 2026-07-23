import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveOrganizationAccessState,
  type OrganizationAccessState,
} from "@/lib/auth/membership-access";

/**
 * Edge-safe membership access lookup for middleware / route handlers.
 * Kept out of membership-queries.ts so Edge does not pull React cache +
 * next/headers server clients.
 */
export async function getOrganizationAccessState(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizationAccessState | null> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("status")
    .eq("user_id", userId);

  if (error?.code === "42P01") {
    return null;
  }

  if (error) {
    return "none";
  }

  return resolveOrganizationAccessState(
    (data ?? []).map((row) => row.status as string),
  );
}
