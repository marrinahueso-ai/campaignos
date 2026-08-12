import { getEventDateSearchText } from "@/lib/calendar-import/date-search";
import type { CalendarImportedEventListItem } from "@/types/communications-calendar";

export type ImportedEventsSourceFilter =
  | "all"
  | "google"
  | "subscribe"
  | "file"
  | "other";

export function matchesImportListSearch(
  event: CalendarImportedEventListItem,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const sourceLabel = formatImportSourceLabel(event.importSource).toLowerCase();

  return (
    event.title.toLowerCase().includes(normalized) ||
    (event.category?.toLowerCase().includes(normalized) ?? false) ||
    sourceLabel.includes(normalized) ||
    getEventDateSearchText(event.date).includes(normalized)
  );
}

export function matchesImportSourceFilter(
  event: CalendarImportedEventListItem,
  filter: ImportedEventsSourceFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  const source = event.importSource?.trim() || null;
  if (filter === "google") {
    return source === "google";
  }
  if (filter === "subscribe") {
    return source === "subscribe";
  }
  if (filter === "file") {
    return source === "ics" || source === "ai_parse";
  }
  return source == null || source === "manual";
}

export function filterImportListEvents(
  events: CalendarImportedEventListItem[],
  options: {
    search?: string;
    sourceFilter?: ImportedEventsSourceFilter;
  },
): CalendarImportedEventListItem[] {
  const search = options.search ?? "";
  const sourceFilter = options.sourceFilter ?? "all";

  return events.filter(
    (event) =>
      matchesImportSourceFilter(event, sourceFilter) &&
      matchesImportListSearch(event, search),
  );
}

/** @deprecated Prefer filterImportListEvents — kept for existing tests. */
export function filterImportListEventsBySearch(
  events: CalendarImportedEventListItem[],
  query: string,
): CalendarImportedEventListItem[] {
  return filterImportListEvents(events, { search: query });
}

export function formatImportSourceLabel(
  importSource: string | null | undefined,
): string {
  switch (importSource) {
    case "google":
      return "Google Calendar";
    case "subscribe":
      return "School RSS Feed";
    case "ics":
      return "Calendar file";
    case "ai_parse":
      return "PDF Import";
    case "manual":
      return "Hey Ralli";
    default:
      return "Hey Ralli";
  }
}
