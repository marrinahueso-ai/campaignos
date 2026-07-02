import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import type { CalendarEventCategory } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";

const CALENDAR_ONLY_TITLE_PATTERN =
  /\b(no school|holiday|break|vacation|teacher workday|staff (?:development|planning|workday|inservice|in-service)|professional development|pd day|memorial day|labor day|thanksgiving|christmas|winter break|spring break|summer break)\b/i;

export const DEFAULT_COMMUNICATION_STRATEGY: CommunicationStrategy = "full_campaign";

export const COMMUNICATION_STRATEGY_OPTIONS: {
  value: CommunicationStrategy;
  label: string;
  description: string;
}[] = [
  {
    value: "full_campaign",
    label: "Full campaign",
    description: "The whole communication plan — timeline, drafts, and publishing.",
  },
  {
    value: "reminder_only",
    label: "Reminders only",
    description: "A few gentle reminders — no full campaign.",
  },
  {
    value: "calendar_only",
    label: "On the calendar only",
    description: "This event can stay on the calendar. No campaign needed.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Pick your own channels and timing — coming soon.",
  },
];

export const COMMUNICATION_STRATEGY_LABELS: Record<CommunicationStrategy, string> =
  Object.fromEntries(
    COMMUNICATION_STRATEGY_OPTIONS.map(({ value, label }) => [value, label]),
  ) as Record<CommunicationStrategy, string>;

export const COMMUNICATION_STRATEGY_BADGE_VARIANTS: Record<
  CommunicationStrategy,
  "default" | "info" | "success" | "warning"
> = {
  full_campaign: "info",
  reminder_only: "warning",
  calendar_only: "default",
  custom: "success",
};

export function parseCommunicationStrategy(
  value: string | null | undefined,
): CommunicationStrategy {
  const match = COMMUNICATION_STRATEGY_OPTIONS.find((option) => option.value === value);
  return match?.value ?? DEFAULT_COMMUNICATION_STRATEGY;
}

export function shouldAssignPlaybook(strategy: CommunicationStrategy): boolean {
  return strategy === "full_campaign" || strategy === "reminder_only";
}

/** Events listed on /events — full campaigns and reminder-only social plans. */
export function isCampaignPageStrategy(strategy: CommunicationStrategy): boolean {
  return (
    strategy === "full_campaign" ||
    strategy === "reminder_only" ||
    strategy === "custom"
  );
}

/** Only full campaigns can be demoted to calendar-only from the Campaigns page. */
export function canDemoteToCalendarOnly(strategy: CommunicationStrategy): boolean {
  return strategy === "full_campaign";
}

export function shouldInitializeCampaignWorkspace(
  strategy: CommunicationStrategy,
): boolean {
  return shouldAssignPlaybook(strategy);
}

export function getResolvedPlaybookIdForStrategy(
  strategy: CommunicationStrategy,
  eventTypePlaybookId: string,
): string | null {
  if (!shouldAssignPlaybook(strategy)) {
    return null;
  }

  return eventTypePlaybookId;
}

/** Category-only fallback when event title is unavailable. */
export function defaultStrategyForCalendarCategory(
  category: CalendarEventCategory,
): CommunicationStrategy {
  switch (category) {
    case "PTO Event":
    case "School Event":
      return "full_campaign";
    case "Early Release":
      return "reminder_only";
    case "Holiday":
      return "reminder_only";
    default:
      return "calendar_only";
  }
}

/** Default communication plan when parsing or reviewing a calendar import row. */
export function defaultStrategyForCalendarImport(
  eventName: string,
  category: CalendarEventCategory,
): CommunicationStrategy {
  if (CALENDAR_ONLY_TITLE_PATTERN.test(eventName) && category !== "Holiday") {
    return "calendar_only";
  }

  const eventType = inferEventTypeFromTitle(eventName, category);

  if (eventType === "holiday") {
    return "reminder_only";
  }

  if (eventType === "early_release" || eventType === "pto_meeting") {
    return "reminder_only";
  }

  if (category === "Early Release") {
    return "reminder_only";
  }

  if (category === "Holiday") {
    return "reminder_only";
  }

  if (category === "PTO Event" || category === "School Event") {
    return "full_campaign";
  }

  return defaultStrategyForCalendarCategory(category);
}
