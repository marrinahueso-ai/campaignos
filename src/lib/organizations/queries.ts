import { cache } from "react";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { createClient } from "@/lib/supabase/server";
import {
  mapBrandAssetsRow,
  mapCalendarImportRow,
  mapOrganizationRow,
} from "@/lib/organizations/mappers";
import type {
  BrandAssetsRow,
  CalendarImportRow,
  Organization,
  OrganizationRow,
  SchoolProfile,
} from "@/types";

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch organizations:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapOrganizationRow(row as OrganizationRow));
}

export async function getOrganizationById(
  id: string,
): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapOrganizationRow(data as OrganizationRow);
}

/** @deprecated Use getCurrentOrganization — kept for compatibility. */
export const getLatestOrganization = cache(getCurrentOrganization);

async function getSchoolProfileUncached(): Promise<SchoolProfile | null> {
  const organization = await getLatestOrganization();

  if (!organization) {
    return null;
  }

  const supabase = await createClient();

  const [{ data: brandData }, { data: calendarData }] = await Promise.all([
    supabase
      .from("brand_assets")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("calendar_imports")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    organization,
    brandAssets: brandData
      ? mapBrandAssetsRow(brandData as BrandAssetsRow)
      : null,
    calendarImport: calendarData
      ? mapCalendarImportRow(calendarData as CalendarImportRow)
      : null,
  };
}

/** Per-request cached school profile (org + brand assets). */
export const getSchoolProfile = cache(getSchoolProfileUncached);

export async function hasSchoolProfile(): Promise<boolean> {
  const organization = await getLatestOrganization();
  return organization !== null;
}
