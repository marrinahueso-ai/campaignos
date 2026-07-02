import { resolveCalendarPlanningWindow } from "@/lib/communications-calendar/planning-date-window";

/** Resolve the school-year label used for calendar window scoping. */
export function resolveCalendarSchoolYearLabel(input: {
  activeSchoolYearLabel?: string | null;
  organizationSchoolYear?: string | null;
}): string | null {
  return input.activeSchoolYearLabel ?? input.organizationSchoolYear ?? null;
}

export function getCalendarPlanningWindow(schoolYearLabel: string | null | undefined) {
  return resolveCalendarPlanningWindow(schoolYearLabel);
}
