import { getEventDateSearchText } from "@/lib/calendar-import/date-search";
import type { CalendarImportedEventListItem } from "@/types/communications-calendar";

export function matchesImportListSearch(
  event: CalendarImportedEventListItem,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    event.title.toLowerCase().includes(normalized) ||
    (event.category?.toLowerCase().includes(normalized) ?? false) ||
    getEventDateSearchText(event.date).includes(normalized)
  );
}

export function filterImportListEventsBySearch(
  events: CalendarImportedEventListItem[],
  query: string,
): CalendarImportedEventListItem[] {
  if (!query.trim()) {
    return events;
  }

  return events.filter((event) => matchesImportListSearch(event, query));
}
