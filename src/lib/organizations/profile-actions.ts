"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
