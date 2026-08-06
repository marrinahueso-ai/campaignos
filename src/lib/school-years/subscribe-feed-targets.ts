import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapSchoolYearRow } from "@/lib/school-years/mappers";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { SchoolYear, SchoolYearRow } from "@/lib/school-years/types";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ActiveSubscribeFeedTarget {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
}

export interface GetActiveSubscribeFeedTargetsOptions {
  /** Cron / background jobs — no user session; membership RLS would return zero rows. */
  useServiceRole?: boolean;
}

/** Active school years that have a saved ICS subscribe URL. */
export async function getActiveSubscribeFeedTargets(
  options?: GetActiveSubscribeFeedTargetsOptions,
): Promise<ActiveSubscribeFeedTarget[]> {
  const useServiceRole = Boolean(options?.useServiceRole);

  if (useServiceRole) {
    if (!isSupabaseAdminConfigured()) {
      return [];
    }
    return listTargetsWithClient(createAdminClient());
  }

  return listTargetsInteractive();
}

async function listTargetsInteractive(): Promise<ActiveSubscribeFeedTarget[]> {
  const supabase = await createClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, school_year, active_school_year_id")
    .not("active_school_year_id", "is", null);

  if (error || !orgs?.length) {
    return [];
  }

  const targets: ActiveSubscribeFeedTarget[] = [];

  for (const org of orgs) {
    const schoolYear = await getActiveSchoolYear(org.id as string);
    if (!schoolYear?.calendarSubscribeUrl?.trim()) {
      continue;
    }

    targets.push({
      organizationId: org.id as string,
      organizationSchoolYear: (org.school_year as string | null) ?? null,
      schoolYear,
    });
  }

  return targets;
}

async function listTargetsWithClient(
  supabase: SupabaseClient,
): Promise<ActiveSubscribeFeedTarget[]> {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, school_year, active_school_year_id")
    .not("active_school_year_id", "is", null);

  if (error) {
    console.error(
      "Subscribe feed cron: list organizations failed",
      error.message,
    );
    return [];
  }

  if (!orgs?.length) {
    return [];
  }

  const targets: ActiveSubscribeFeedTarget[] = [];

  for (const org of orgs) {
    const activeId = org.active_school_year_id as string | null;
    if (!activeId) {
      continue;
    }

    const { data: schoolYearRow, error: yearError } = await supabase
      .from("school_years")
      .select("*")
      .eq("id", activeId)
      .maybeSingle();

    if (yearError || !schoolYearRow) {
      continue;
    }

    const schoolYear = mapSchoolYearRow(schoolYearRow as SchoolYearRow);
    if (!schoolYear.calendarSubscribeUrl?.trim()) {
      continue;
    }

    targets.push({
      organizationId: org.id as string,
      organizationSchoolYear: (org.school_year as string | null) ?? null,
      schoolYear,
    });
  }

  return targets;
}
