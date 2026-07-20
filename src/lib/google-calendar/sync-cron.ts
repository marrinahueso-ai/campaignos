import "server-only";

import {
  mapGoogleCalendarConnectionRow,
} from "@/lib/google-calendar/connection";
import {
  syncSchoolYearGoogleCalendar,
  type SyncGoogleCalendarResult,
} from "@/lib/google-calendar/sync";
import type { GoogleCalendarConnectionRow } from "@/lib/google-calendar/types";
import { mapSchoolYearRow } from "@/lib/school-years/mappers";
import type { SchoolYearRow } from "@/lib/school-years/types";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/** Daily cron — auto-import new Google Calendar events (deduped). */
export async function syncAllActiveGoogleCalendars(): Promise<{
  targetCount: number;
  results: SyncGoogleCalendarResult[];
}> {
  if (!isSupabaseAdminConfigured()) {
    return { targetCount: 0, results: [] };
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("organization_google_calendar_connections")
    .select("*");

  if (error || !connections?.length) {
    if (error) {
      console.error("Google Calendar cron: list connections failed", error.message);
    }
    return { targetCount: 0, results: [] };
  }

  const results: SyncGoogleCalendarResult[] = [];

  for (const row of connections) {
    const connection = mapGoogleCalendarConnectionRow(
      row as GoogleCalendarConnectionRow,
    );
    const organizationId = connection.organizationId;

    const { data: org } = await admin
      .from("organizations")
      .select("id, school_year, active_school_year_id")
      .eq("id", organizationId)
      .maybeSingle();

    if (!org?.active_school_year_id) {
      continue;
    }

    const { data: schoolYearRow } = await admin
      .from("school_years")
      .select("*")
      .eq("id", org.active_school_year_id as string)
      .maybeSingle();

    if (!schoolYearRow) {
      continue;
    }

    const schoolYear = mapSchoolYearRow(schoolYearRow as SchoolYearRow);
    const result = await syncSchoolYearGoogleCalendar({
      organizationId,
      organizationSchoolYear: (org.school_year as string | null) ?? null,
      schoolYear,
      connection,
      autoImport: true,
      useServiceRole: true,
    });
    results.push(result);
  }

  return {
    targetCount: results.length,
    results,
  };
}
