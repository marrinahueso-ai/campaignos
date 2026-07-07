import { parseSchoolYearRange } from "@/lib/calendar-import/extract-date-lines";
import { formatMonthLabel } from "@/lib/communications-calendar/workload";
import { normalizeDateOnly } from "@/lib/utils/dates";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";

export interface PlanningHubSwitcherDateWindow {
  startDate: string;
  endDate: string;
}

/** July 1, 2026 – June 30, 2027 when the active school year label is unavailable. */
export const PLANNING_HUB_SCHOOL_YEAR_FALLBACK: PlanningHubSwitcherDateWindow = {
  startDate: "2026-07-01",
  endDate: "2027-06-30",
};

export function resolvePlanningHubSwitcherDateWindow(
  schoolYearLabel?: string | null,
): PlanningHubSwitcherDateWindow {
  const range = parseSchoolYearRange(schoolYearLabel);
  if (!range) {
    return PLANNING_HUB_SCHOOL_YEAR_FALLBACK;
  }

  return {
    startDate: `${range.startYear}-07-01`,
    endDate: `${range.endYear}-06-30`,
  };
}

export function isEventInPlanningHubDateWindow(
  eventDate: string,
  window: PlanningHubSwitcherDateWindow,
): boolean {
  const date = normalizeDateOnly(eventDate);
  return date >= window.startDate && date <= window.endDate;
}

function normalizeEventTitleForDedup(title: string): string {
  return title.trim().toLocaleLowerCase();
}

function planningHubSwitcherStrategyRank(strategy: CommunicationStrategy): number {
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

function shouldPreferPlanningHubSwitcherCandidate(
  candidate: Event,
  incumbent: Event,
): boolean {
  const byStrategy =
    planningHubSwitcherStrategyRank(candidate.communicationStrategy) -
    planningHubSwitcherStrategyRank(incumbent.communicationStrategy);
  if (byStrategy !== 0) {
    return byStrategy < 0;
  }

  const byDate = candidate.date.localeCompare(incumbent.date);
  if (byDate !== 0) {
    return byDate > 0;
  }

  const candidateUpdated = candidate.updatedAt ?? candidate.createdAt;
  const incumbentUpdated = incumbent.updatedAt ?? incumbent.createdAt;
  return candidateUpdated.localeCompare(incumbentUpdated) > 0;
}

export interface CampaignMonthGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  events: Event[];
}

export function groupEventsByMonth(events: Event[]): CampaignMonthGroup[] {
  const groups = new Map<string, Event[]>();

  for (const event of events) {
    const date = normalizeDateOnly(event.date);
    const [yearText, monthText] = date.split("-");
    const key = `${yearText}-${monthText}`;

    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, monthEvents]) => {
      const [yearText, monthText] = key.split("-");
      const year = Number(yearText);
      const month = Number(monthText) - 1;

      return {
        key,
        label: formatMonthLabel(year, month),
        year,
        month,
        events: monthEvents,
      };
    });
}

export interface SortedCampaignMonthGroups {
  activeGroups: CampaignMonthGroup[];
  pastGroups: CampaignMonthGroup[];
}

/** Current month first, then upcoming months; past months grouped at the end. */
export function sortCampaignMonthGroups(
  groups: CampaignMonthGroup[],
  today: string,
): SortedCampaignMonthGroups {
  const currentMonthKey = today.slice(0, 7);
  const activeGroups: CampaignMonthGroup[] = [];
  const pastGroups: CampaignMonthGroup[] = [];

  for (const group of groups) {
    if (group.key < currentMonthKey) {
      pastGroups.push(group);
    } else {
      activeGroups.push(group);
    }
  }

  activeGroups.sort((left, right) => {
    if (left.key === currentMonthKey) return -1;
    if (right.key === currentMonthKey) return 1;
    return left.key.localeCompare(right.key);
  });

  // Most recently passed month first within the past group (June before May in July).
  pastGroups.sort((left, right) => right.key.localeCompare(left.key));

  return { activeGroups, pastGroups };
}

export function isPastCampaignMonth(group: CampaignMonthGroup, today: string): boolean {
  return group.key < today.slice(0, 7);
}

/** Planning Hub event switcher — one school-year window, deduped titles, A–Z. */
export function buildPlanningHubSwitcherEvents(
  campaignEvents: Event[],
  currentEvent: Event,
  options?: { dateWindow?: PlanningHubSwitcherDateWindow },
): Event[] {
  const dateWindow = options?.dateWindow ?? PLANNING_HUB_SCHOOL_YEAR_FALLBACK;

  const inWindow = campaignEvents.filter(
    (entry) =>
      entry.id === currentEvent.id ||
      isEventInPlanningHubDateWindow(entry.date, dateWindow),
  );

  const eventsByTitle = new Map<string, Event>();
  for (const entry of inWindow) {
    const titleKey = normalizeEventTitleForDedup(entry.title);
    const existing = eventsByTitle.get(titleKey);
    if (!existing || shouldPreferPlanningHubSwitcherCandidate(entry, existing)) {
      eventsByTitle.set(titleKey, entry);
    }
  }

  eventsByTitle.set(normalizeEventTitleForDedup(currentEvent.title), currentEvent);

  return [...eventsByTitle.values()].sort((left, right) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
  );
}
