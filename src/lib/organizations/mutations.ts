import { createClient } from "@/lib/supabase/server";
import { createOrganizationMembership } from "@/lib/auth/membership-mutations";
import { getAuthUser } from "@/lib/auth/queries";
import { seedOrganizationPlaybookDefaults } from "@/lib/playbooks/mutations";
import { seedOrganizationWorkspace } from "@/lib/organization-workspace/seed";
import { ensureSchoolYearForOrganization } from "@/lib/school-years/mutations";
import {
  getCalendarFileType,
  mapBrandAssetsRow,
  mapOrganizationRow,
  toBrandAssetsInsert,
  toOrganizationInsert,
} from "@/lib/organizations/mappers";
import type { FoundingAccessResolution } from "@/lib/auth/founding-access";
import type {
  BrandAssetsRow,
  OrganizationRow,
  SchoolSetupInput,
} from "@/types";

const SCHOOL_ASSETS_BUCKET = "school-assets";
const CALENDAR_UPLOADS_BUCKET = "calendar-uploads";

async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string | null> {
  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    console.error(`Failed to upload file to ${bucket}:`, error.message);
    return null;
  }

  if (bucket === SCHOOL_ASSETS_BUCKET) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  return path;
}

export async function createSchoolProfile(
  input: SchoolSetupInput,
  files: {
    ptoLogo: File | null;
    schoolLogo: File | null;
    calendarFile: File | null;
  },
  foundingAccess: FoundingAccessResolution = {
    valid: true,
    billingExempt: false,
    normalizedCode: null,
    error: null,
  },
) {
  const supabase = await createClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      ...toOrganizationInsert(input),
      founding_access_code: foundingAccess.billingExempt
        ? foundingAccess.normalizedCode
        : null,
      billing_exempt_at: foundingAccess.billingExempt
        ? new Date().toISOString()
        : null,
    })
    .select("*")
    .single();

  if (organizationError || !organization) {
    console.error("Failed to create organization:", organizationError?.message);
    return { error: "Unable to save school information. Please try again." };
  }

  const organizationId = organization.id;
  await seedOrganizationPlaybookDefaults(organizationId);
  await seedOrganizationWorkspace(organizationId);
  await ensureSchoolYearForOrganization({
    organizationId,
    label: input.schoolYear?.trim() || "Current school year",
    activate: true,
  });

  const authUser = await getAuthUser();
  if (authUser) {
    await createOrganizationMembership({
      organizationId,
      userId: authUser.id,
      email: authUser.email,
      campaignRole: "admin",
      status: "active",
    });
  }

  let ptoLogoUrl: string | null = null;
  let schoolLogoUrl: string | null = null;

  if (files.ptoLogo) {
    const extension = files.ptoLogo.name.split(".").pop() ?? "png";
    ptoLogoUrl = await uploadFile(
      SCHOOL_ASSETS_BUCKET,
      `${organizationId}/pto-logo.${extension}`,
      files.ptoLogo,
    );
  }

  if (files.schoolLogo) {
    const extension = files.schoolLogo.name.split(".").pop() ?? "png";
    schoolLogoUrl = await uploadFile(
      SCHOOL_ASSETS_BUCKET,
      `${organizationId}/school-logo.${extension}`,
      files.schoolLogo,
    );
  }

  const { data: brandAssets, error: brandError } = await supabase
    .from("brand_assets")
    .insert(
      toBrandAssetsInsert(organizationId, input, {
        ptoLogo: ptoLogoUrl,
        schoolLogo: schoolLogoUrl,
      }),
    )
    .select("*")
    .single();

  if (brandError || !brandAssets) {
    console.error("Failed to create brand assets:", brandError?.message);
    return { error: "Unable to save brand kit. Please try again." };
  }

  if (files.calendarFile) {
    const fileType = getCalendarFileType(files.calendarFile.name);

    if (!fileType) {
      return { error: "Calendar file must be PDF, Word (.docx), Excel, CSV, or ICS." };
    }

    const storagePath = `${organizationId}/${Date.now()}-${files.calendarFile.name}`;
    const uploadedPath = await uploadFile(
      CALENDAR_UPLOADS_BUCKET,
      storagePath,
      files.calendarFile,
    );

    if (!uploadedPath) {
      return { error: "Unable to upload calendar file. Please try again." };
    }

    const { error: calendarError } = await supabase.from("calendar_imports").insert({
      organization_id: organizationId,
      filename: files.calendarFile.name,
      file_type: fileType,
      upload_status: "uploaded",
      storage_path: uploadedPath,
    });

    if (calendarError) {
      console.error("Failed to save calendar import:", calendarError.message);
      return { error: "Unable to save calendar upload. Please try again." };
    }
  }

  return {
    organization: mapOrganizationRow(organization as OrganizationRow),
    brandAssets: mapBrandAssetsRow(brandAssets as BrandAssetsRow),
  };
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete organization:", error.message);
    return false;
  }

  return true;
}
