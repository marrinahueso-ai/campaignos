import {
  addDaysToDateOnly,
  normalizeDateOnly,
} from "../utils/dates.ts";
import type { Event } from "../../types/index.ts";

function isUpcomingForArtwork(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  const windowEnd = addDaysToDateOnly(today, 60);
  return date >= today && date <= windowEnd;
}

/**
 * Event IDs that need hero artwork on Events Home.
 * Ease UI can surface any school-year event (Upcoming focus, All, Month),
 * so prefetch the active-year scope (or full feed when unscoped).
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

  // Prefer upcoming first so cold paths still paint the horizon quickly if truncated later.
  const upcoming = defaultScope
    .filter((event) => isUpcomingForArtwork(event, today))
    .sort((left, right) => left.date.localeCompare(right.date));

  const rest = defaultScope
    .filter((event) => !upcoming.some((row) => row.id === event.id))
    .slice(0, Math.max(0, 80 - upcoming.length));

  return [...new Set([...upcoming, ...rest].map((event) => event.id))];
}
