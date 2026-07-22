import {
  getTodayDateString,
  normalizeDateOnly,
} from "@/lib/utils/dates";
import type {
  CalendarEventCategory,
  CalendarReviewEvent,
  CalendarReviewStats,
} from "@/types/calendar-review";

export type CalendarReviewFilter =
  | "all"
  | "conflicts"
  | "duplicates"
  | "updates"
  | CalendarEventCategory;

export type CalendarReviewDateFilter = "all" | "upcoming" | "past";

export type CalendarReviewStatKey = keyof CalendarReviewStats;

const STAT_KEY_TO_FILTER: Record<CalendarReviewStatKey, CalendarReviewFilter> = {
  totalEventsFound: "all",
  ptoEvents: "PTO Event",
  schoolEvents: "School Event",
  holidays: "Holiday",
  earlyReleaseDays: "Early Release",
  conflictsFound: "conflicts",
  duplicatesFound: "duplicates",
  updatesFound: "updates",
};

export function statKeyToFilter(key: CalendarReviewStatKey): CalendarReviewFilter {
  return STAT_KEY_TO_FILTER[key];
}

export function isPastReviewEvent(
  event: CalendarReviewEvent,
  today: string = getTodayDateString(),
): boolean {
  return normalizeDateOnly(event.date) < normalizeDateOnly(today);
}

export function matchesReviewSearch(
  event: CalendarReviewEvent,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    event.name.toLowerCase().includes(normalized) ||
    event.category.toLowerCase().includes(normalized) ||
    (event.matchReason?.toLowerCase().includes(normalized) ?? false)
  );
}

export function filterReviewEvents(
  events: CalendarReviewEvent[],
  filter: CalendarReviewFilter,
): CalendarReviewEvent[] {
  if (filter === "all") {
    return events;
  }

  if (filter === "conflicts") {
    return events.filter((event) => event.status === "conflict");
  }

  if (filter === "duplicates") {
    return events.filter((event) => event.status === "duplicate");
  }

  if (filter === "updates") {
    return events.filter((event) => event.status === "update");
  }

  return events.filter((event) => event.category === filter);
}

export function filterReviewEventsByDate(
  events: CalendarReviewEvent[],
  dateFilter: CalendarReviewDateFilter,
  today: string = getTodayDateString(),
): CalendarReviewEvent[] {
  if (dateFilter === "all") {
    return events;
  }

  if (dateFilter === "past") {
    return events.filter((event) => isPastReviewEvent(event, today));
  }

  return events.filter((event) => !isPastReviewEvent(event, today));
}

export function filterReviewEventsBySearch(
  events: CalendarReviewEvent[],
  query: string,
): CalendarReviewEvent[] {
  if (!query.trim()) {
    return events;
  }

  return events.filter((event) => matchesReviewSearch(event, query));
}

export function applyReviewEventFilters(
  events: CalendarReviewEvent[],
  options: {
    filter?: CalendarReviewFilter;
    dateFilter?: CalendarReviewDateFilter;
    search?: string;
    today?: string;
  },
): CalendarReviewEvent[] {
  const {
    filter = "all",
    dateFilter = "all",
    search = "",
    today = getTodayDateString(),
  } = options;

  return filterReviewEventsBySearch(
    filterReviewEventsByDate(filterReviewEvents(events, filter), dateFilter, today),
    search,
  );
}

export function getPastReviewEventIds(
  events: CalendarReviewEvent[],
  today: string = getTodayDateString(),
): string[] {
  return events
    .filter((event) => isPastReviewEvent(event, today))
    .map((event) => event.id);
}

export function getReviewFilterLabel(filter: CalendarReviewFilter): string {
  switch (filter) {
    case "all":
      return "All events";
    case "conflicts":
      return "Conflicts";
    case "duplicates":
      return "Duplicates";
    case "updates":
      return "Updates";
    case "PTO Event":
      return "PTO events";
    case "School Event":
      return "School events";
    case "Holiday":
      return "Holidays";
    case "Early Release":
      return "Early release days";
  }
}

export function getReviewDateFilterLabel(
  dateFilter: CalendarReviewDateFilter,
): string {
  switch (dateFilter) {
    case "all":
      return "All dates";
    case "upcoming":
      return "Upcoming";
    case "past":
      return "Past";
  }
}
