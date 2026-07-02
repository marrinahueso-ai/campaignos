import { formatRelativeTimingLabel } from "@/lib/communications/communication-plan-display";
import {
  defaultStrategyForCalendarImport,
} from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import { resolveTimingStepsForEvent } from "@/lib/playbooks/timing-presets";
import type {
  CalendarEventCategory,
  CalendarReviewEvent,
} from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

/** Pre–full-campaign-default category fallbacks stored in older parsed imports. */
const LEGACY_CATEGORY_STRATEGY: Record<CalendarEventCategory, CommunicationStrategy> =
  {
    "PTO Event": "reminder_only",
    "School Event": "reminder_only",
    "Early Release": "reminder_only",
    Holiday: "reminder_only",
  };

export function getStrategyPlanSummary(
  eventType: EventType | null,
  strategy: CommunicationStrategy,
): string {
  if (strategy === "calendar_only") {
    return "No posts scheduled";
  }

  if (strategy === "custom") {
    return "Configure in workspace";
  }

  const steps = resolveTimingStepsForEvent({
    eventType,
    communicationStrategy: strategy,
  });

  if (steps.length === 0) {
    return "No posts scheduled";
  }

  return `${steps.length} posts · ${steps
    .map((step) => formatRelativeTimingLabel(step.relativeDay))
    .join(", ")}`;
}

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
): CalendarReviewEvent[] {
  return events.map((event) => ({
    ...event,
    eventType: inferEventTypeFromTitle(event.name, event.category),
    communicationStrategy: defaultStrategyForCalendarImport(
      event.name,
      event.category,
    ),
    planManuallySet: false,
  }));
}

export function reviewEventsNeedPlanRefresh(
  stored: CalendarReviewEvent[],
  normalized: CalendarReviewEvent[],
): boolean {
  return JSON.stringify(stored) !== JSON.stringify(normalized);
}
