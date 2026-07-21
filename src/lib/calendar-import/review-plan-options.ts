import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { SYSTEM_PLAYBOOK_IDS } from "@/lib/playbooks/constants";
import type { CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

export const CALENDAR_ONLY_PLAN_VALUE = "calendar_only" as const;

export interface ReviewPlaybookOption {
  id: string;
  name: string;
  eventType: EventType;
  stepCount?: number;
}

export type CalendarReviewPlanOption =
  | {
      kind: "calendar_only";
      value: typeof CALENDAR_ONLY_PLAN_VALUE;
      label: string;
      summary: string;
    }
  | {
      kind: "playbook";
      value: string;
      playbookId: string;
      label: string;
      summary: string;
      eventType: EventType;
    };

export interface ResolvedReviewPlanSelection {
  playbookId: string | null;
  communicationStrategy: CommunicationStrategy;
  eventType?: EventType;
}

export function getPlaybookPlanSummary(stepCount: number | undefined): string {
  const count = stepCount ?? 0;
  if (count <= 0) {
    return "No steps yet";
  }
  return `${count} step${count === 1 ? "" : "s"}`;
}

export function buildCalendarReviewPlanOptions(
  playbooks: ReviewPlaybookOption[],
): CalendarReviewPlanOption[] {
  const calendarOnly: CalendarReviewPlanOption = {
    kind: "calendar_only",
    value: CALENDAR_ONLY_PLAN_VALUE,
    label: "On the calendar only",
    summary: "No posts scheduled",
  };

  const playbookOptions: CalendarReviewPlanOption[] = playbooks.map(
    (playbook) => ({
      kind: "playbook" as const,
      value: playbook.id,
      playbookId: playbook.id,
      label: playbook.name,
      summary: getPlaybookPlanSummary(playbook.stepCount),
      eventType: playbook.eventType,
    }),
  );

  return [calendarOnly, ...playbookOptions];
}

export function resolveReviewPlanSelection(
  value: string,
  playbooks: ReviewPlaybookOption[],
): ResolvedReviewPlanSelection {
  if (value === CALENDAR_ONLY_PLAN_VALUE || !value) {
    return {
      playbookId: null,
      communicationStrategy: "calendar_only",
    };
  }

  const playbook = playbooks.find((option) => option.id === value);
  if (!playbook) {
    return {
      playbookId: null,
      communicationStrategy: "calendar_only",
    };
  }

  return {
    playbookId: playbook.id,
    communicationStrategy: "full_campaign",
    eventType: playbook.eventType,
  };
}

/** Prefer system general-event playbook, then matching event type, then first. */
export function defaultPlaybookIdForReview(
  eventType: EventType | null | undefined,
  communicationStrategy: CommunicationStrategy,
  playbooks: ReviewPlaybookOption[],
): string | null {
  if (!shouldAssignPlaybook(communicationStrategy) || playbooks.length === 0) {
    return null;
  }

  if (eventType) {
    const systemId = SYSTEM_PLAYBOOK_IDS[eventType];
    const bySystemId = playbooks.find((playbook) => playbook.id === systemId);
    if (bySystemId) {
      return bySystemId.id;
    }

    const byEventType = playbooks.find(
      (playbook) => playbook.eventType === eventType,
    );
    if (byEventType) {
      return byEventType.id;
    }
  }

  const general =
    playbooks.find(
      (playbook) => playbook.id === SYSTEM_PLAYBOOK_IDS.general_event,
    ) ??
    playbooks.find((playbook) => playbook.eventType === "general_event") ??
    playbooks[0];

  return general?.id ?? null;
}

export function getSelectedReviewPlanValue(
  event: Pick<
    CalendarReviewEvent,
    "playbookId" | "communicationStrategy" | "eventType"
  >,
  playbooks: ReviewPlaybookOption[],
): string {
  if (
    event.communicationStrategy === "calendar_only" ||
    event.communicationStrategy === "custom"
  ) {
    return CALENDAR_ONLY_PLAN_VALUE;
  }

  if (
    event.playbookId &&
    playbooks.some((playbook) => playbook.id === event.playbookId)
  ) {
    return event.playbookId;
  }

  return (
    defaultPlaybookIdForReview(
      event.eventType,
      event.communicationStrategy,
      playbooks,
    ) ?? CALENDAR_ONLY_PLAN_VALUE
  );
}

/**
 * Fill missing playbookId from strategy + event type defaults.
 * Does not override manually chosen playbooks or calendar-only rows.
 */
export function applyPlaybookDefaultsToReviewEvents(
  events: CalendarReviewEvent[],
  playbooks: ReviewPlaybookOption[],
): CalendarReviewEvent[] {
  return events.map((event) => {
    if (
      event.communicationStrategy === "calendar_only" ||
      event.communicationStrategy === "custom"
    ) {
      if (event.playbookId == null) {
        return event;
      }
      return { ...event, playbookId: null };
    }

    if (event.playbookId && playbooks.some((p) => p.id === event.playbookId)) {
      return event;
    }

    const playbookId = defaultPlaybookIdForReview(
      event.eventType,
      event.communicationStrategy,
      playbooks,
    );

    if (!playbookId) {
      return { ...event, playbookId: null };
    }

    const playbook = playbooks.find((option) => option.id === playbookId);
    return {
      ...event,
      playbookId,
      eventType: playbook?.eventType ?? event.eventType,
      communicationStrategy: shouldAssignPlaybook(event.communicationStrategy)
        ? event.communicationStrategy === "reminder_only"
          ? "reminder_only"
          : "full_campaign"
        : "full_campaign",
    };
  });
}
