import { parseSchoolYearRange } from "@/lib/calendar-import/extract-date-lines";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";

export interface PlanningDateWindow {
  startDate: string;
  endDate: string;
}

/** Full calendar / publishing hub — current school year when known. */
export function resolveCalendarPlanningWindow(
  schoolYear?: string | null,
): PlanningDateWindow {
  const today = getTodayDateString();
  const range = parseSchoolYearRange(schoolYear);
  if (range) {
    let startDate = `${range.startYear}-08-01`;
    const endDate = `${range.endYear}-07-31`;

    // Orgs often activate the next school year before August; July events still
    // belong to the outgoing year and must stay in the calendar window.
    if (today < startDate) {
      startDate = `${range.startYear - 1}-08-01`;
    }

    return { startDate, endDate };
  }

  return {
    startDate: addDaysToDateOnly(today, -120),
    endDate: addDaysToDateOnly(today, 365),
  };
}

/** Dashboard Today — recent overdue work plus the next few months. */
export function resolveTodayPlanningWindow(
  schoolYear?: string | null,
): PlanningDateWindow {
  const today = getTodayDateString();
  const calendarWindow = resolveCalendarPlanningWindow(schoolYear);
  const lookbackStart = addDaysToDateOnly(today, -45);
  const lookAheadEnd = addDaysToDateOnly(today, 120);
  // Extend past the labeled school-year end so early-fall events (e.g. Aug) aren't clipped in late spring/summer.
  const extendedEnd = addDaysToDateOnly(calendarWindow.endDate, 45);
  const endDate =
    lookAheadEnd > extendedEnd ? lookAheadEnd : extendedEnd;

  return {
    startDate:
      lookbackStart > calendarWindow.startDate
        ? lookbackStart
        : calendarWindow.startDate,
    endDate,
  };
}
