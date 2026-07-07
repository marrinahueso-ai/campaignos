import { formatMonthLabel } from "@/lib/communications-calendar/workload";
import { normalizeDateOnly } from "@/lib/utils/dates";
import type { Event } from "@/types";

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

/** Planning Hub event switcher — active-year list, A–Z, current event always included. */
export function buildPlanningHubSwitcherEvents(
  campaignEvents: Event[],
  currentEvent: Event,
): Event[] {
  const eventsById = new Map<string, Event>();

  for (const entry of campaignEvents) {
    eventsById.set(entry.id, entry);
  }

  if (!eventsById.has(currentEvent.id)) {
    eventsById.set(currentEvent.id, currentEvent);
  }

  return [...eventsById.values()].sort((left, right) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
  );
}
