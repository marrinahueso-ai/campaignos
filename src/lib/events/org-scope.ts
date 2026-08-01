import { assertActiveMembershipInOrganization } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export const getOrganizationSchoolYearIds = cache(
  async function getOrganizationSchoolYearIds(
    organizationId: string,
  ): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("school_years")
      .select("id")
      .eq("organization_id", organizationId);

    if (error || !data?.length) {
      return [];
    }

    return data.map((row) => row.id as string);
  },
);

/**
 * Resolve the org id used for event/school-year scoping.
 * Explicit client/org ids are never trusted without an active membership assert.
 * Pass `undefined` to use the caller's current (cookie-active) organization.
 * Pass `null` to fail closed with no scope.
 */
export async function resolveScopedOrganizationId(
  organizationId?: string | null,
): Promise<string | null> {
  if (organizationId === null) {
    return null;
  }

  if (organizationId) {
    const allowed = await assertActiveMembershipInOrganization(organizationId);
    if (!allowed) {
      return null;
    }
    return organizationId;
  }

  const organization = await getCurrentOrganization();
  return organization?.id ?? null;
}

/**
 * Active-org event ids for the current school years.
 * Shared by approvals + scheduling sidebar badges so layout GETs hit this once.
 */
export const resolveScopedOrgEventIds = cache(
  async function resolveScopedOrgEventIds(
    organizationId?: string | null,
  ): Promise<string[]> {
    const scopedOrgId = await resolveScopedOrganizationId(organizationId);
    if (!scopedOrgId) {
      return [];
    }

    const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
    if (!schoolYearIds.length) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .in("school_year_id", schoolYearIds);

    if (error) {
      console.error("Failed to scope organization event ids:", error.message);
      return [];
    }

    return (data ?? []).map((row) => row.id as string);
  },
);
