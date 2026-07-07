import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import {
  resolvePlanningHubSwitcherDateWindow,
  type PlanningHubSwitcherDateWindow,
} from "@/lib/events/campaign-page-utils";
import { mapSchoolYearRow } from "@/lib/school-years/mappers";
import type { SchoolYear, SchoolYearRow } from "@/lib/school-years/types";

export async function getSchoolYearsForOrganization(
  organizationId: string,
): Promise<SchoolYear[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_years")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch school years:", error.message);
    return [];
  }

  return (data as SchoolYearRow[]).map(mapSchoolYearRow);
}

export async function getActiveSchoolYear(
  organizationId: string,
): Promise<SchoolYear | null> {
  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("active_school_year_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError || !org?.active_school_year_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("school_years")
    .select("*")
    .eq("id", org.active_school_year_id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSchoolYearRow(data as SchoolYearRow);
}

export function getPlanningHubSwitcherDateWindow(
  schoolYear: Pick<SchoolYear, "label"> | null | undefined,
): PlanningHubSwitcherDateWindow {
  return resolvePlanningHubSwitcherDateWindow(schoolYear?.label);
}
