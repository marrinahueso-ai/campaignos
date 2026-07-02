import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { SchoolYear } from "@/lib/school-years/types";

export interface ActiveSubscribeFeedTarget {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
}

/** Active school years that have a saved ICS subscribe URL. */
export async function getActiveSubscribeFeedTargets(): Promise<
  ActiveSubscribeFeedTarget[]
> {
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
