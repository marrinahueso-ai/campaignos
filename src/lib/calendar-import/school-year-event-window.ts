import {
  isEventInPlanningHubDateWindow,
  resolvePlanningHubSwitcherDateWindow,
} from "@/lib/events/campaign-page-utils";
import { normalizeDateOnly } from "@/lib/utils/dates";

/**
 * Drop feed/import rows outside the active school year (Jul 1–Jun 30 from label).
 * Prior-year dates must not stage into Review or auto-import.
 */
export function filterEventsToSchoolYearWindow<T extends { date: string }>(
  events: T[],
  schoolYearLabel: string | null | undefined,
): T[] {
  const window = resolvePlanningHubSwitcherDateWindow(schoolYearLabel);
  return events.filter((event) => {
    const date = normalizeDateOnly(event.date);
    if (!date) return false;
    return isEventInPlanningHubDateWindow(date, window);
  });
}

/** ISO bounds for Google Calendar list queries (school year, not rolling ±). */
export function schoolYearGoogleTimeBounds(
  schoolYearLabel: string | null | undefined,
): { timeMin: string; timeMax: string } {
  const window = resolvePlanningHubSwitcherDateWindow(schoolYearLabel);
  return {
    timeMin: `${window.startDate}T00:00:00.000Z`,
    timeMax: `${window.endDate}T23:59:59.999Z`,
  };
}
