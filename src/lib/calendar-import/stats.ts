import type {
  CalendarEventCategory,
  CalendarReviewEvent,
  CalendarReviewStats,
} from "@/types/calendar-review";

export function buildCalendarReviewStats(
  events: CalendarReviewEvent[],
): CalendarReviewStats {
  const countByCategory = (category: CalendarEventCategory) =>
    events.filter((event) => event.category === category).length;

  return {
    totalEventsFound: events.length,
    ptoEvents: countByCategory("PTO Event"),
    schoolEvents: countByCategory("School Event"),
    holidays: countByCategory("Holiday"),
    earlyReleaseDays: countByCategory("Early Release"),
    conflictsFound: events.filter((event) => event.status === "conflict").length,
  };
}
