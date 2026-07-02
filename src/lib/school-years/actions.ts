"use server";

import { revalidatePath } from "next/cache";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  activateSchoolYear,
  closeSchoolYearAndStartNext,
  ensureSchoolYearForOrganization,
  updateSchoolYearSubscribeUrl,
} from "@/lib/school-years/mutations";
import {
  getActiveSchoolYear,
  getSchoolYearsForOrganization,
} from "@/lib/school-years/queries";
import type { SchoolYear } from "@/lib/school-years/types";

export interface SchoolYearSettingsData {
  organizationId: string;
  organizationSchoolYearLabel: string | null;
  activeSchoolYear: SchoolYear | null;
  schoolYears: SchoolYear[];
}

export async function getSchoolYearSettingsData(): Promise<SchoolYearSettingsData | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const [activeSchoolYear, schoolYears] = await Promise.all([
    getActiveSchoolYear(organization.id),
    getSchoolYearsForOrganization(organization.id),
  ]);

  return {
    organizationId: organization.id,
    organizationSchoolYearLabel: organization.schoolYear,
    activeSchoolYear,
    schoolYears,
  };
}

export async function closeSchoolYearAndBeginNextAction(input: {
  nextYearLabel: string;
  calendarSubscribeUrl?: string;
}): Promise<{ error: string | null; success: boolean }> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "Complete school setup first.", success: false };
  }

  const nextYear = await closeSchoolYearAndStartNext({
    organizationId: organization.id,
    nextYearLabel: input.nextYearLabel,
    calendarSubscribeUrl: input.calendarSubscribeUrl ?? null,
  });

  if (!nextYear) {
    return {
      error: "Unable to start the next school year. Run migration 023 in Supabase.",
      success: false,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/school-setup");
  revalidatePath("/school-setup");
  revalidatePath("/calendar");
  return { error: null, success: true };
}

export async function saveCalendarSubscribeUrlAction(
  schoolYearId: string,
  calendarSubscribeUrl: string,
): Promise<{ error: string | null; success: boolean }> {
  const saved = await updateSchoolYearSubscribeUrl(
    schoolYearId,
    calendarSubscribeUrl,
  );

  if (!saved) {
    return { error: "Unable to save subscribe feed URL.", success: false };
  }

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function ensureOrganizationSchoolYearAction(
  label: string,
): Promise<{ error: string | null; success: boolean }> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "No organization found.", success: false };
  }

  const schoolYear = await ensureSchoolYearForOrganization({
    organizationId: organization.id,
    label,
    activate: true,
  });

  if (!schoolYear) {
    return { error: "Unable to create school year record.", success: false };
  }

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function activateSchoolYearAction(
  schoolYearId: string,
): Promise<{ error: string | null; success: boolean }> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "No organization found.", success: false };
  }

  const ok = await activateSchoolYear(organization.id, schoolYearId);
  if (!ok) {
    return { error: "Unable to activate school year.", success: false };
  }

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return { error: null, success: true };
}
