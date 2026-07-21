import {
  defaultPlaybookIdForReview,
  type ReviewPlaybookOption,
} from "@/lib/calendar-import/review-plan-options";
import {
  defaultStrategyForCalendarImport,
} from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import type {
  CalendarEventCategory,
  CalendarReviewEvent,
} from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";

/** Pre–full-campaign-default category fallbacks stored in older parsed imports. */
const LEGACY_CATEGORY_STRATEGY: Record<CalendarEventCategory, CommunicationStrategy> =
  {
    "PTO Event": "reminder_only",
    "School Event": "reminder_only",
    "Early Release": "reminder_only",
    Holiday: "reminder_only",
  };

export function normalizeCalendarReviewEvent(
  event: CalendarReviewEvent,
): CalendarReviewEvent {
  const eventType =
    event.eventType ?? inferEventTypeFromTitle(event.name, event.category);
  const recommended = defaultStrategyForCalendarImport(event.name, event.category);

  const usesLegacyAutoDefault =
    !event.planManuallySet &&
    event.communicationStrategy === LEGACY_CATEGORY_STRATEGY[event.category] &&
    recommended !== event.communicationStrategy;

  const communicationStrategy = usesLegacyAutoDefault
    ? recommended
    : (event.communicationStrategy ?? recommended);

  return {
    ...event,
    eventType,
    communicationStrategy,
  };
}

export function normalizeCalendarReviewEvents(
  events: CalendarReviewEvent[],
): CalendarReviewEvent[] {
  return events.map(normalizeCalendarReviewEvent);
}

export function applyRecommendedPlansToEvents(
  events: CalendarReviewEvent[],
  playbooks: ReviewPlaybookOption[] = [],
): CalendarReviewEvent[] {
  return events.map((event) => {
    const eventType = inferEventTypeFromTitle(event.name, event.category);
    const communicationStrategy = defaultStrategyForCalendarImport(
      event.name,
      event.category,
    );
    const playbookId = defaultPlaybookIdForReview(
      eventType,
      communicationStrategy,
      playbooks,
    );

    return {
      ...event,
      eventType,
      communicationStrategy,
      playbookId,
      planManuallySet: false,
    };
  });
}

export function reviewEventsNeedPlanRefresh(
  stored: CalendarReviewEvent[],
  normalized: CalendarReviewEvent[],
): boolean {
  return JSON.stringify(stored) !== JSON.stringify(normalized);
}
