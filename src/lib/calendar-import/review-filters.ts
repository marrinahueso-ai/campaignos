import type {
  CalendarEventCategory,
  CalendarReviewEvent,
  CalendarReviewStats,
} from "@/types/calendar-review";

export type CalendarReviewFilter = "all" | "conflicts" | CalendarEventCategory;

export type CalendarReviewStatKey = keyof CalendarReviewStats;

const STAT_KEY_TO_FILTER: Record<CalendarReviewStatKey, CalendarReviewFilter> = {
  totalEventsFound: "all",
  ptoEvents: "PTO Event",
  schoolEvents: "School Event",
  holidays: "Holiday",
  earlyReleaseDays: "Early Release",
  conflictsFound: "conflicts",
};

export function statKeyToFilter(key: CalendarReviewStatKey): CalendarReviewFilter {
  return STAT_KEY_TO_FILTER[key];
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

  return events.filter((event) => event.category === filter);
}

export function getReviewFilterLabel(filter: CalendarReviewFilter): string {
  switch (filter) {
    case "all":
      return "All events";
    case "conflicts":
      return "Conflicts";
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
