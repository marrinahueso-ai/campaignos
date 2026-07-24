import { buildGoodNews } from "@/lib/today/build-good-news";
import {
  isCampaignPageStrategy,
  shouldAssignPlaybook,
} from "@/lib/events/communication-strategy";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventHistoryContext } from "@/lib/memory";
import { calculateCommunicationHealth } from "@/lib/playbooks/health";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { Event } from "@/types";
import type {
  TodayActionItem,
  TodayEventProgress,
  TodayPageData,
  TodayWaitingOnOthersItem,
  TodayWeekEntry,
  TodayWhatsNext,
} from "@/types/today";
import { addDaysToDateOnly } from "@/lib/utils/dates";
import type { EventCommunicationStep } from "@/types/playbooks";

interface BuildTodayDataInput {
  today: string;
  firstName: string | null;
  planningItems: PlanningCalendarItem[];
  events: Event[];
  /** School events dated in the visible mini-calendar month. */
  monthEvents: Event[];
  /** School events dated today through +7 days (This Week strip). */
  weekStripEvents: Event[];
  /** Campaign-strategy events in the week (teammate note). */
  weekEvents: Event[];
  stepsByEventId: Map<string, EventCommunicationStep[]>;
  intelligenceByEventId?: Map<string, CampaignIntelligence>;
  memoryHintsByEventId?: Map<string, EventHistoryContext>;
}

const COMPLETE_STATUSES = new Set(["completed", "skipped", "published", "cancelled"]);

function isActiveStep(item: PlanningCalendarItem): boolean {
  return (
    item.sourceType === "timeline_task" &&
    item.status === "upcoming"
  );
}

function stepItems(items: PlanningCalendarItem[]): PlanningCalendarItem[] {
  return items.filter(isActiveStep);
}

function overdueSteps(items: PlanningCalendarItem[], today: string): PlanningCalendarItem[] {
  return stepItems(items)
    .filter((item) => item.scheduledDate < today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function dueTodaySteps(items: PlanningCalendarItem[], today: string): PlanningCalendarItem[] {
  return stepItems(items).filter((item) => item.scheduledDate === today);
}

function upcomingSteps(items: PlanningCalendarItem[], today: string): PlanningCalendarItem[] {
  return stepItems(items)
    .filter((item) => item.scheduledDate > today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function upcomingEvents(events: Event[], today: string): Event[] {
  return events
    .filter((event) => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function channelLabel(channel: PlanningCalendarItem["channel"]): string {
  if (!channel) return "communication";
  return CHANNEL_LABELS[channel] ?? channel;
}

function stepHref(eventId: string): string {
  return `/events/${eventId}`;
}

function strategyPriority(strategy: CommunicationStrategy): number {
  switch (strategy) {
    case "full_campaign":
      return 0;
    case "reminder_only":
      return 1;
    case "custom":
      return 2;
    default:
      return 3;
  }
}

function compareCampaignEvents(left: Event, right: Event): number {
  const byStrategy =
    strategyPriority(left.communicationStrategy) -
    strategyPriority(right.communicationStrategy);
  if (byStrategy !== 0) {
    return byStrategy;
  }
  return left.date.localeCompare(right.date);
}

function buildEventStrategyById(
  events: Event[],
  planningItems: PlanningCalendarItem[] = [],
): Map<string, CommunicationStrategy> {
  const map = new Map(events.map((event) => [event.id, event.communicationStrategy]));
  for (const item of planningItems) {
    if (item.communicationStrategy) {
      map.set(item.eventId, item.communicationStrategy);
    }
  }
  return map;
}

function filterCampaignPlanningItems(
  items: PlanningCalendarItem[],
  strategyByEventId: Map<string, CommunicationStrategy>,
): PlanningCalendarItem[] {
  return items.filter(
    (item) => strategyByEventId.get(item.eventId) !== "calendar_only",
  );
}

function pickPrimaryCampaignEvent(events: Event[], today: string): Event | null {
  const candidates = events
    .filter(
      (event) =>
        isCampaignPageStrategy(event.communicationStrategy) && event.date >= today,
    )
    .sort(compareCampaignEvents);

  return candidates[0] ?? null;
}

function whatsNextFromIntelligence(
  event: Event,
  intelligence: CampaignIntelligence,
): TodayWhatsNext {
  const nextAction = intelligence.nextAction;
  if (!nextAction) {
    return {
      kind: "event",
      title: `Open ${event.title} workspace`,
      subtitle: event.date,
      href: stepHref(event.id),
      ctaLabel: "Open",
      eventId: event.id,
    };
  }

  const isOpenWorkspaceAction =
    nextAction.description === "Event workspace" ||
    nextAction.description === "Nothing needed right now";

  return {
    kind: isOpenWorkspaceAction ? "event" : "step",
    title: isOpenWorkspaceAction
      ? `Open ${event.title} workspace`
      : `${nextAction.verb} ${nextAction.description} for ${event.title}`,
    subtitle: intelligence.summary,
    href: nextAction.href,
    ctaLabel: nextAction.verb,
    eventId: event.id,
  };
}

function buildStepTitle(item: PlanningCalendarItem): string {
  const channel = channelLabel(item.channel);
  if (item.draftContent || item.draftStatus === "draft" || item.draftStatus === "generated") {
    return `Review ${channel} for ${item.eventTitle}`;
  }
  if (item.channel === "instagram" || item.channel === "facebook") {
    return `Schedule ${channel} for ${item.eventTitle}`;
  }
  return `Continue ${item.title} for ${item.eventTitle}`;
}

function stepCta(item: PlanningCalendarItem): string {
  if (item.draftContent || item.draftStatus === "draft" || item.draftStatus === "generated") {
    return "Review";
  }
  if (item.channel === "instagram" || item.channel === "facebook") {
    return "Schedule";
  }
  return "Continue";
}

function toActionItem(item: PlanningCalendarItem, today: string): TodayActionItem {
  return {
    id: item.id,
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    title: buildStepTitle(item),
    dueDate: item.scheduledDate,
    isOverdue: item.scheduledDate < today,
    href: stepHref(item.eventId),
    ctaLabel: stepCta(item),
  };
}

export function buildWhatsNext(input: BuildTodayDataInput): TodayWhatsNext {
  const { planningItems, events, today, intelligenceByEventId } = input;
  const strategyByEventId = buildEventStrategyById(events, planningItems);
  const campaignPlanningItems = filterCampaignPlanningItems(
    planningItems,
    strategyByEventId,
  );

  const enrichWhatsNext = (next: TodayWhatsNext): TodayWhatsNext => {
    if (!next.eventId || !intelligenceByEventId) {
      return next;
    }

    const intelligence = intelligenceByEventId.get(next.eventId);
    if (!intelligence || next.kind === "caught_up") {
      return next;
    }

    return {
      ...next,
      subtitle: intelligence.summary,
    };
  };

  const primaryEvent = pickPrimaryCampaignEvent(events, today);
  if (primaryEvent && intelligenceByEventId) {
    const intelligence = intelligenceByEventId.get(primaryEvent.id);
    if (intelligence && intelligence.readinessLabel !== "calendar_only") {
      return enrichWhatsNext(whatsNextFromIntelligence(primaryEvent, intelligence));
    }
  }

  const overdue = overdueSteps(campaignPlanningItems, today);
  if (overdue[0]) {
    const item = overdue[0];
    return enrichWhatsNext({
      kind: "step",
      title: buildStepTitle(item),
      subtitle: item.eventTitle,
      href: stepHref(item.eventId),
      ctaLabel: stepCta(item),
      eventId: item.eventId,
    });
  }

  const todaySteps = dueTodaySteps(campaignPlanningItems, today);
  if (todaySteps[0]) {
    const item = todaySteps[0];
    return enrichWhatsNext({
      kind: "step",
      title: buildStepTitle(item),
      subtitle: "Due today",
      href: stepHref(item.eventId),
      ctaLabel: stepCta(item),
      eventId: item.eventId,
    });
  }

  const nextStep = upcomingSteps(campaignPlanningItems, today)[0];
  if (nextStep) {
    return enrichWhatsNext({
      kind: "step",
      title: buildStepTitle(nextStep),
      subtitle: nextStep.eventTitle,
      href: stepHref(nextStep.eventId),
      ctaLabel: stepCta(nextStep),
      eventId: nextStep.eventId,
    });
  }

  if (primaryEvent) {
    return enrichWhatsNext({
      kind: "event",
      title: `Open ${primaryEvent.title} workspace`,
      subtitle: primaryEvent.date,
      href: stepHref(primaryEvent.id),
      ctaLabel: "Open",
      eventId: primaryEvent.id,
    });
  }

  const nextEvent = upcomingEvents(events, today).find((event) =>
    isCampaignPageStrategy(event.communicationStrategy),
  );
  if (nextEvent) {
    return enrichWhatsNext({
      kind: "event",
      title: `Open ${nextEvent.title} workspace`,
      subtitle: nextEvent.date,
      href: stepHref(nextEvent.id),
      ctaLabel: "Open",
      eventId: nextEvent.id,
    });
  }

  return {
    kind: "caught_up",
    title: "You're all caught up",
    subtitle: "Nothing needs you right now — enjoy the calm.",
    href: "/calendar",
    ctaLabel: "View calendar",
    eventId: null,
  };
}

export function buildWaitingOnMe(
  items: PlanningCalendarItem[],
  today: string,
  limit = 5,
): TodayActionItem[] {
  const actionable = stepItems(items)
    .filter((item) => item.scheduledDate <= today || item.scheduledDate <= addDaysToDateOnly(today, 3))
    .sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);

  return actionable.map((item) => toActionItem(item, today));
}

export function buildWaitingOnOthers(
  items: PlanningCalendarItem[],
): TodayWaitingOnOthersItem[] {
  return items
    .filter(
      (item) =>
        item.sourceType === "approval" &&
        (item.approvalStatus === "pending" || item.status === "pending"),
    )
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      eventId: item.eventId,
      eventTitle: item.eventTitle,
      title: `Waiting on approval — ${item.eventTitle}`,
      dueDate: item.scheduledDate,
    }));
}

/**
 * Dashboard "This Week" strip: school events only (same rule as mini calendar).
 * Reminder / schedule / publish steps stay on Communications — not here.
 */
export function buildThisWeek(
  events: Event[],
  today: string,
): TodayWeekEntry[] {
  const end = addDaysToDateOnly(today, 7);

  return events
    .filter(
      (event) =>
        event.status !== "archived" &&
        event.date >= today &&
        event.date <= end,
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.title.localeCompare(b.title);
    })
    .map((event) => ({
      id: `event-${event.id}`,
      date: event.date,
      title: event.title,
      eventTitle: null,
      kind: "event" as const,
      href: `/events/${event.id}`,
    }));
}

/** Mini-calendar markers: real school events only (no schedule steps / published posts). */
export function buildMonthEventEntries(
  events: Event[],
  today: string,
): TodayWeekEntry[] {
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    return [];
  }
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return events
    .filter(
      (event) =>
        event.status !== "archived" &&
        event.date >= start &&
        event.date <= end,
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.title.localeCompare(b.title);
    })
    .map((event) => ({
      id: `event-${event.id}`,
      date: event.date,
      title: event.title,
      eventTitle: null,
      kind: "event" as const,
      href: `/events/${event.id}`,
    }));
}

export function buildUpcomingEventProgress(
  events: Event[],
  stepsByEventId: Map<string, EventCommunicationStep[]>,
  intelligenceByEventId?: Map<string, CampaignIntelligence>,
): TodayEventProgress[] {
  return events.map((event) => {
    const intelligence = intelligenceByEventId?.get(event.id);
    if (intelligence) {
      return {
        eventId: event.id,
        title: event.title,
        date: event.date,
        progressPercent:
          intelligence.readinessLabel === "calendar_only"
            ? null
            : intelligence.completionPercent,
        progressLabel:
          intelligence.readinessLabel === "calendar_only"
            ? null
            : `${intelligence.completionPercent}% complete`,
        statusLine: intelligence.summary,
        href: stepHref(event.id),
        communicationStrategy: event.communicationStrategy,
      };
    }

    const steps = stepsByEventId.get(event.id) ?? [];
    const hasCampaign = shouldAssignPlaybook(event.communicationStrategy);

    if (!hasCampaign || steps.length === 0) {
      return {
        eventId: event.id,
        title: event.title,
        date: event.date,
        progressPercent: null,
        progressLabel: null,
        statusLine:
          event.communicationStrategy === "calendar_only"
            ? "On the calendar only"
            : "Ready when you are",
        href: stepHref(event.id),
        communicationStrategy: event.communicationStrategy,
      };
    }

    const health = calculateCommunicationHealth(steps);
    const percent = health.healthPercent;

    let statusLine = "You're making good progress";
    if (percent >= 80) statusLine = "Everything is on schedule";
    if (percent === 100) statusLine = "All set for now";

    return {
      eventId: event.id,
      title: event.title,
      date: event.date,
      progressPercent: percent,
      progressLabel: `${percent}% complete`,
      statusLine,
      href: stepHref(event.id),
      communicationStrategy: event.communicationStrategy,
    };
  });
}

export function buildTeammateNote(input: {
  attentionCount: number;
  weekEvents: Event[];
  upcomingEvents: TodayEventProgress[];
  intelligenceByEventId?: Map<string, CampaignIntelligence>;
}): string {
  const { attentionCount, weekEvents, upcomingEvents, intelligenceByEventId } =
    input;

  if (attentionCount === 0) {
    const thriving = upcomingEvents.find((event) => {
      const intelligence = intelligenceByEventId?.get(event.eventId);
      return (
        intelligence?.readinessLabel === "on_track" ||
        intelligence?.readinessLabel === "ready_to_publish"
      );
    });
    if (thriving) {
      return thriving.statusLine;
    }

    const hasCampaignWeekEvents = weekEvents.some((event) =>
      isCampaignPageStrategy(event.communicationStrategy),
    );
    if (!hasCampaignWeekEvents) {
      const calendarOnly = weekEvents.find(
        (event) => event.communicationStrategy === "calendar_only",
      );
      if (calendarOnly) {
        return `${calendarOnly.title} can stay on the calendar. No campaign needed.`;
      }
    }
    return "Nothing urgent today.";
  }

  const needsAttention = upcomingEvents.find((event) => {
    const intelligence = intelligenceByEventId?.get(event.eventId);
    return intelligence?.readinessLabel === "needs_attention";
  });
  if (needsAttention) {
    return needsAttention.statusLine;
  }

  const thriving = upcomingEvents.find(
    (event) => event.progressPercent !== null && event.progressPercent >= 80,
  );
  if (thriving) {
    return `${thriving.title} is looking great.`;
  }

  return "Take it one step at a time — you've got this.";
}

export function buildTodayPageData(input: BuildTodayDataInput): TodayPageData {
  const strategyByEventId = buildEventStrategyById(input.events, input.planningItems);
  const campaignPlanningItems = filterCampaignPlanningItems(
    input.planningItems,
    strategyByEventId,
  );

  const waitingOnMe = buildWaitingOnMe(campaignPlanningItems, input.today);
  const waitingOnOthers = buildWaitingOnOthers(input.planningItems);
  const hasOverdueSteps = overdueSteps(campaignPlanningItems, input.today).length > 0;
  const attentionCount = stepItems(campaignPlanningItems).filter(
    (item) => item.scheduledDate <= input.today,
  ).length;

  const upcomingEvents = buildUpcomingEventProgress(
    input.events,
    input.stepsByEventId,
    input.intelligenceByEventId,
  );

  const goodNews = buildGoodNews({
    planningItems: input.planningItems,
    today: input.today,
    hasOverdueSteps,
    events: input.events,
    memoryHintsByEventId: input.memoryHintsByEventId,
  });

  return {
    firstName: input.firstName,
    attentionCount,
    whatsNext: buildWhatsNext(input),
    waitingOnMe,
    waitingOnOthers,
    thisWeek: buildThisWeek(input.weekStripEvents, input.today),
    monthEvents: buildMonthEventEntries(input.monthEvents, input.today),
    upcomingEvents,
    teammateNote: buildTeammateNote({
      attentionCount,
      weekEvents: input.weekEvents,
      upcomingEvents,
      intelligenceByEventId: input.intelligenceByEventId,
    }),
    goodNews,
  };
}
