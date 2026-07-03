import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { createClient } from "@/lib/supabase/server";

export async function getOrganizationSchoolYearIds(
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
}

export async function resolveScopedOrganizationId(
  organizationId?: string | null,
): Promise<string | null> {
  if (organizationId === null) {
    return null;
  }

  if (organizationId) {
    return organizationId;
  }

  const organization = await getCurrentOrganization();
  return organization?.id ?? null;
}
