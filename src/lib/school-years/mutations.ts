import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { mapSchoolYearRow } from "@/lib/school-years/mappers";
import type { SchoolYear, SchoolYearRow } from "@/lib/school-years/types";

export async function ensureSchoolYearForOrganization(input: {
  organizationId: string;
  label: string;
  activate?: boolean;
}): Promise<SchoolYear | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const label = input.label.trim() || "Current school year";

  const { data: existing } = await supabase
    .from("school_years")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("label", label)
    .maybeSingle();

  if (existing) {
    const schoolYear = mapSchoolYearRow(existing as SchoolYearRow);
    if (input.activate && schoolYear.status !== "closed") {
      await setActiveSchoolYear(input.organizationId, schoolYear.id, label);
    }
    return schoolYear;
  }

  const { data, error } = await supabase
    .from("school_years")
    .insert({
      organization_id: input.organizationId,
      label,
      status: input.activate === false ? "planning" : "active",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    console.error("Failed to create school year:", error.message);
    return null;
  }

  const schoolYear = mapSchoolYearRow(data as SchoolYearRow);

  if (input.activate !== false) {
    await setActiveSchoolYear(input.organizationId, schoolYear.id, label);
  }

  return schoolYear;
}

async function setActiveSchoolYear(
  organizationId: string,
  schoolYearId: string,
  label: string,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("school_years")
    .update({ status: "closed", closed_at: now, updated_at: now })
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .neq("id", schoolYearId);

  await supabase
    .from("school_years")
    .update({ status: "active", updated_at: now })
    .eq("id", schoolYearId);

  await supabase
    .from("organizations")
    .update({
      active_school_year_id: schoolYearId,
      school_year: label,
    })
    .eq("id", organizationId);
}

export async function closeSchoolYearAndStartNext(input: {
  organizationId: string;
  nextYearLabel: string;
  calendarSubscribeUrl?: string | null;
}): Promise<SchoolYear | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const label = input.nextYearLabel.trim();

  if (!label) {
    return null;
  }

  await supabase
    .from("school_years")
    .update({ status: "closed", closed_at: now, updated_at: now })
    .eq("organization_id", input.organizationId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("school_years")
    .insert({
      organization_id: input.organizationId,
      label,
      status: "planning",
      calendar_subscribe_url: input.calendarSubscribeUrl?.trim() || null,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    console.error("Failed to start next school year:", error.message);
    return null;
  }

  const schoolYear = mapSchoolYearRow(data as SchoolYearRow);

  await supabase
    .from("organizations")
    .update({
      active_school_year_id: schoolYear.id,
      school_year: label,
    })
    .eq("id", input.organizationId);

  return schoolYear;
}

export async function updateSchoolYearSubscribeUrl(
  schoolYearId: string,
  calendarSubscribeUrl: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("school_years")
    .update({
      calendar_subscribe_url: calendarSubscribeUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolYearId);

  if (error) {
    if (isMissingSchemaError(error)) {
      return false;
    }
    console.error("Failed to update calendar subscribe URL:", error.message);
    return false;
  }

  return true;
}

export async function activateSchoolYear(
  organizationId: string,
  schoolYearId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_years")
    .select("label")
    .eq("id", schoolYearId)
    .maybeSingle();

  if (!data?.label) {
    return false;
  }

  await setActiveSchoolYear(organizationId, schoolYearId, data.label as string);
  return true;
}

export async function linkCalendarImportToSchoolYear(
  calendarImportId: string,
  schoolYearId: string | null,
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? (await createClient());
  await supabase
    .from("calendar_imports")
    .update({ school_year_id: schoolYearId })
    .eq("id", calendarImportId);
}
