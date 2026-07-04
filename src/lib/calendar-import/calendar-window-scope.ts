import "server-only";

import { getCalendarPlanningWindow } from "@/lib/calendar-import/calendar-window";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { PlanningDateWindow } from "@/lib/communications-calendar/planning-date-window";

export async function resolveOrganizationCalendarWindowScope(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<{
  organizationId: string;
  schoolYearIds: string[];
  window: PlanningDateWindow;
} | null> {
  const organization = organizationId
    ? { id: organizationId }
    : await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(organization.id);
  if (!schoolYearIds.length) {
    return null;
  }

  return {
    organizationId: organization.id,
    schoolYearIds,
    window: getCalendarPlanningWindow(schoolYearLabel),
  };
}

export async function getCalendarWindowEventIds(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<string[]> {
  const scope = await resolveOrganizationCalendarWindowScope(
    schoolYearLabel,
    organizationId,
  );
  if (!scope) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .gte("date", scope.window.startDate)
    .lte("date", scope.window.endDate)
    .neq("status", "archived")
    .in("school_year_id", scope.schoolYearIds);

  if (error) {
    console.error("Failed to list calendar window events:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
}

export async function getCalendarWindowEventCount(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<number> {
  const scope = await resolveOrganizationCalendarWindowScope(
    schoolYearLabel,
    organizationId,
  );
  if (!scope) {
    return 0;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .gte("date", scope.window.startDate)
    .lte("date", scope.window.endDate)
    .neq("status", "archived")
    .in("school_year_id", scope.schoolYearIds);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
