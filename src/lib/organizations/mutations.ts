import { createClient } from "@/lib/supabase/server";
import { createOrganizationMembership } from "@/lib/auth/membership-mutations";
import { getAuthUser } from "@/lib/auth/queries";
import { validateCalendarSubscribeUrl } from "@/lib/calendar-import/fetch-subscribe-feed";
import { seedOrganizationPlaybookDefaults } from "@/lib/playbooks/mutations";
import { seedOrganizationWorkspace } from "@/lib/organization-workspace/seed";
import {
  ensureSchoolYearForOrganization,
  updateSchoolYearSubscribeUrl,
} from "@/lib/school-years/mutations";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import {
  getCalendarFileType,
  mapBrandAssetsRow,
  mapOrganizationRow,
  toBrandAssetsInsert,
  toOrganizationInsert,
} from "@/lib/organizations/mappers";
import type { FoundingAccessResolution } from "@/lib/auth/founding-access";
import { defaultSchoolYearLabel } from "@/lib/onboarding/state";
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

  // Membership must exist before org-scoped RLS allows seed/writes (Phase C).
  const authUser = await getAuthUser();
  if (authUser) {
    const membership = await createOrganizationMembership({
      organizationId,
      userId: authUser.id,
      email: authUser.email,
      campaignRole: "admin",
      status: "active",
    });
    if ("error" in membership) {
      console.error("Failed to create founding membership:", membership.error);
      return { error: "Unable to create your team membership. Please try again." };
    }
  }

  await seedOrganizationPlaybookDefaults(organizationId);
  await seedOrganizationWorkspace(organizationId);
  await ensureSchoolYearForOrganization({
    organizationId,
    label: input.schoolYear?.trim() || "Current school year",
    activate: true,
  });

  if (input.calendarSubscribeUrl) {
    const validation = validateCalendarSubscribeUrl(input.calendarSubscribeUrl);
    if (validation.valid) {
      const activeSchoolYear = await getActiveSchoolYear(organizationId);
      if (activeSchoolYear) {
        await updateSchoolYearSubscribeUrl(
          activeSchoolYear.id,
          validation.normalized || null,
        );
      }
    }
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

/**
 * Minimal org for value-first onboarding — name/timezone defaults, seeds, empty brand row.
 * Does not require the full school-setup wizard.
 */
export async function bootstrapMinimalOrganization(input: {
  name?: string;
  timezone?: string;
  foundingAccess?: FoundingAccessResolution;
}): Promise<{ organizationId: string } | { error: string }> {
  const foundingAccess = input.foundingAccess ?? {
    valid: true,
    billingExempt: false,
    normalizedCode: null,
    error: null,
  };

  const supabase = await createClient();
  const timezone = input.timezone?.trim() || "America/Chicago";
  const name = input.name?.trim() || "My school";
  const schoolYear = defaultSchoolYearLabel();
  const now = new Date().toISOString();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name,
      district: null,
      school_year: schoolYear,
      mascot: null,
      principal: null,
      school_website: null,
      pto_website: null,
      timezone,
      founding_access_code: foundingAccess.billingExempt
        ? foundingAccess.normalizedCode
        : null,
      billing_exempt_at: foundingAccess.billingExempt ? now : null,
      onboarding_state: {
        version: 1,
        startedAt: now,
      },
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    console.error(
      "Failed to bootstrap organization:",
      organizationError?.message,
    );
    return { error: "Unable to create your workspace. Please try again." };
  }

  const organizationId = organization.id as string;
  const authUser = await getAuthUser();
  if (authUser) {
    const membership = await createOrganizationMembership({
      organizationId,
      userId: authUser.id,
      email: authUser.email,
      campaignRole: "admin",
      status: "active",
    });
    if ("error" in membership) {
      console.error("Failed to create founding membership:", membership.error);
      return {
        error: "Unable to create your team membership. Please try again.",
      };
    }
  }

  await seedOrganizationPlaybookDefaults(organizationId);
  await seedOrganizationWorkspace(organizationId);
  await ensureSchoolYearForOrganization({
    organizationId,
    label: schoolYear,
    activate: true,
  });

  const { error: brandError } = await supabase.from("brand_assets").insert({
    organization_id: organizationId,
    pto_logo: null,
    school_logo: null,
    primary_color: "#0F2E38",
    secondary_color: "#DDBA4C",
    font_family: "Modern",
  });

  if (brandError) {
    console.error("Failed to create default brand assets:", brandError.message);
    return { error: "Unable to finish workspace setup. Please try again." };
  }

  return { organizationId };
}

export async function updateOrganizationBrand(input: {
  organizationId: string;
  mascot?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  ptoLogo?: File | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  if (input.mascot !== undefined) {
    const { error } = await supabase
      .from("organizations")
      .update({ mascot: input.mascot?.trim() || null })
      .eq("id", input.organizationId);
    if (error) {
      console.error("Failed to update mascot:", error.message);
      return { error: "Unable to save mascot." };
    }
  }

  let ptoLogoUrl: string | undefined;
  if (input.ptoLogo && input.ptoLogo.size > 0) {
    const extension = input.ptoLogo.name.split(".").pop() ?? "png";
    const uploaded = await uploadFile(
      SCHOOL_ASSETS_BUCKET,
      `${input.organizationId}/pto-logo.${extension}`,
      input.ptoLogo,
    );
    if (!uploaded) {
      return { error: "Unable to upload logo." };
    }
    ptoLogoUrl = uploaded;
  }

  const brandPatch: Record<string, string | null> = {};
  if (input.primaryColor !== undefined) {
    brandPatch.primary_color = input.primaryColor;
  }
  if (input.secondaryColor !== undefined) {
    brandPatch.secondary_color = input.secondaryColor;
  }
  if (ptoLogoUrl !== undefined) {
    brandPatch.pto_logo = ptoLogoUrl;
  }

  if (Object.keys(brandPatch).length > 0) {
    const { data: existing } = await supabase
      .from("brand_assets")
      .select("id")
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("brand_assets")
        .update(brandPatch)
        .eq("id", existing.id);
      if (error) {
        console.error("Failed to update brand assets:", error.message);
        return { error: "Unable to save brand kit." };
      }
    } else {
      const { error } = await supabase.from("brand_assets").insert({
        organization_id: input.organizationId,
        pto_logo: brandPatch.pto_logo ?? null,
        school_logo: null,
        primary_color: brandPatch.primary_color ?? "#0F2E38",
        secondary_color: brandPatch.secondary_color ?? "#DDBA4C",
        font_family: "Modern",
      });
      if (error) {
        console.error("Failed to insert brand assets:", error.message);
        return { error: "Unable to save brand kit." };
      }
    }
  }

  return { error: null };
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
