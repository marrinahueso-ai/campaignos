import { cache } from "react";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { mapOrganizationRow } from "@/lib/organizations/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationRow } from "@/types";

async function fetchOrganizationById(id: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOrganizationRow(data as OrganizationRow);
}

async function getLatestOrganizationLegacy(): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOrganizationRow(data as OrganizationRow);
}

/**
 * Resolves the organization for the signed-in user via active membership.
 * Authenticated users without membership always get null (never inherit a random org).
 * Legacy latest-org fallback applies only when nobody is signed in (local dev).
 */
export const getCurrentOrganization = cache(async (): Promise<Organization | null> => {
  const user = await getAuthUser();

  if (user) {
    const membership = await getActiveMembership();
    if (membership) {
      return fetchOrganizationById(membership.organizationId);
    }

    return null;
  }

  const membershipTableAvailable = await isOrganizationUsersAvailable();
  if (membershipTableAvailable) {
    return null;
  }

  return getLatestOrganizationLegacy();
});

async function isOrganizationUsersAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("organization_users").select("id").limit(1);
  return !error || error.code !== "42P01";
}

export { getLatestOrganizationLegacy };
