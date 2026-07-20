import {
  addDaysToDateOnly,
  normalizeDateOnly,
} from "../utils/dates.ts";
import type { Event } from "../../types/index.ts";

/** Keep in sync with CAMPAIGNS_PAGE_SIZE in campaign-display.ts */
const EVENTS_HOME_LIST_PAGE_SIZE = 5;

function isUpcomingForArtwork(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  const windowEnd = addDaysToDateOnly(today, 60);
  return date >= today && date <= windowEnd;
}

/**
 * Event IDs that need hero artwork on Events Home for the default view:
 * Upcoming strip + the first All Events page (same helpers as the client UI).
 */
export function collectEventsHomeArtworkEventIds(
  events: Event[],
  today: string,
  activeSchoolYearId?: string | null,
): string[] {
  const defaultScope =
    activeSchoolYearId != null && activeSchoolYearId !== "all"
      ? events.filter((event) => event.schoolYearId === activeSchoolYearId)
      : events;

  const upcoming = defaultScope
    .filter((event) => isUpcomingForArtwork(event, today))
    .sort((left, right) => left.date.localeCompare(right.date));

  const firstPage = defaultScope.slice(0, EVENTS_HOME_LIST_PAGE_SIZE);

  return [...new Set([...upcoming, ...firstPage].map((event) => event.id))];
}
