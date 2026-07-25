import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveOrganizationId } from "@/lib/auth/active-organization";
import {
  resolveOrganizationAccessState,
  type OrganizationAccessState,
} from "@/lib/auth/membership-access";
import { isCanceledSubscriptionLockout } from "@/lib/billing/subscription-lockout";

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

/**
 * Edge-safe resolution of the caller's active organization id (cookie
 * preference + active memberships), mirroring getActiveMembership's logic
 * without next/headers / React cache so it can run in middleware.
 */
export async function resolveEdgeActiveOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  preferredOrganizationId: string | null,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !data) {
    return null;
  }

  return resolveActiveOrganizationId({
    preferredOrganizationId,
    membershipOrganizationIds: data.map((row) => row.organization_id as string),
  });
}

/**
 * Edge-safe check for the "subscription actually canceled" lockout on one
 * organization (not billing-exempt, not "never subscribed" — see
 * src/lib/billing/subscription-lockout.ts for the safety proof).
 */
export async function getOrganizationCanceledLockout(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("organizations")
    .select("billing_exempt_at, subscription_status")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return isCanceledSubscriptionLockout(data);
}
