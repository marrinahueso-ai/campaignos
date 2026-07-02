import { defaultStrategyForCalendarImport } from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import type {
  CalendarEventCategory,
  CalendarEventReviewStatus,
  CalendarReviewData,
  CalendarReviewEvent,
} from "@/types/calendar-review";

function reviewEvent(
  id: string,
  name: string,
  date: string,
  category: CalendarEventCategory,
  status: CalendarEventReviewStatus,
): CalendarReviewEvent {
  return {
    id,
    name,
    date,
    category,
    status,
    communicationStrategy: defaultStrategyForCalendarImport(name, category),
    eventType: inferEventTypeFromTitle(name, category),
  };
}

export const SAMPLE_CALENDAR_REVIEW: CalendarReviewData = {
  filename: "2025-2026_Lincoln_Elementary_Calendar.pdf",
  uploadedAt: "2025-08-15T14:32:00.000Z",
  stats: {
    totalEventsFound: 24,
    ptoEvents: 8,
    schoolEvents: 10,
    holidays: 4,
    earlyReleaseDays: 2,
    conflictsFound: 2,
  },
  events: [
    reviewEvent("evt-001", "First Day of School", "2025-08-18", "School Event", "ready"),
    reviewEvent("evt-002", "PTO Welcome Coffee", "2025-08-22", "PTO Event", "ready"),
    reviewEvent("evt-003", "Labor Day — No School", "2025-09-01", "Holiday", "ready"),
    reviewEvent("evt-004", "Fall Picture Day", "2025-09-12", "School Event", "ready"),
    reviewEvent(
      "evt-005",
      "Fall Festival & Bake Sale",
      "2025-10-04",
      "PTO Event",
      "needs_review",
    ),
    reviewEvent(
      "evt-006",
      "Early Release — Staff Development",
      "2025-10-17",
      "Early Release",
      "ready",
    ),
    reviewEvent("evt-007", "Book Fair Setup Night", "2025-11-03", "PTO Event", "conflict"),
    reviewEvent(
      "evt-008",
      "Parent-Teacher Conferences",
      "2025-11-06",
      "School Event",
      "conflict",
    ),
    reviewEvent("evt-009", "Thanksgiving Break", "2025-11-24", "Holiday", "ready"),
    reviewEvent("evt-010", "Winter Concert", "2025-12-18", "School Event", "needs_review"),
  ],
};
