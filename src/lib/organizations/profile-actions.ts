"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { updateOrganizationProfile } from "@/lib/organizations/mutations";
import { COMMON_US_TIMEZONES } from "@/types/posting-preferences";

export interface OrganizationProfileFormState {
  error: string | null;
  success: boolean;
}

export async function updateOrganizationProfileAction(
  _prev: OrganizationProfileFormState,
  formData: FormData,
): Promise<OrganizationProfileFormState> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found.", success: false };
  }

  // Same org-structural mutation class as roles/roster/committees in
  // organization-workspace/actions.ts — RLS only enforces org-membership
  // isolation, not template permission keys, so manage_people must be
  // checked here at the app layer.
  const access = await requirePermission("manage_people");
  if ("error" in access) {
    return { error: access.error, success: false };
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const timezone = formData.get("timezone")?.toString().trim() ?? "";

  if (!name) {
    return { error: "School name is required.", success: false };
  }
  if (
    !timezone ||
    !(COMMON_US_TIMEZONES as readonly string[]).includes(timezone)
  ) {
    return { error: "Select a valid timezone.", success: false };
  }

  const result = await updateOrganizationProfile({
    organizationId: organization.id,
    name,
    timezone,
    district: formData.get("district")?.toString().trim() || null,
    addressLine1: formData.get("addressLine1")?.toString().trim() || null,
    addressLine2: formData.get("addressLine2")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    state: formData.get("state")?.toString().trim() || null,
    postalCode: formData.get("postalCode")?.toString().trim() || null,
    country: formData.get("country")?.toString().trim() || null,
    weatherCity: formData.get("weatherCity")?.toString().trim() || null,
    weatherState: formData.get("weatherState")?.toString().trim() || null,
    weatherZip: formData.get("weatherZip")?.toString().trim() || null,
    schoolYear: formData.get("schoolYear")?.toString().trim() || null,
    principal: formData.get("principal")?.toString().trim() || null,
    mascot: formData.get("mascot")?.toString().trim() || null,
    schoolWebsite: formData.get("schoolWebsite")?.toString().trim() || null,
    ptoWebsite: formData.get("ptoWebsite")?.toString().trim() || null,
  });

  if (result.error) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/organization");
  revalidatePath("/dashboard");
  redirect("/settings/organization");
}
