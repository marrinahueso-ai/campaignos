import type { Event } from "@/types";

/** Inclusive date filter for events already loaded in a wider window. */
export function filterEventsByDateInclusive(
  events: Event[],
  startDate: string,
  endDate: string,
): Event[] {
  return events.filter(
    (event) => event.date >= startDate && event.date <= endDate,
  );
}
