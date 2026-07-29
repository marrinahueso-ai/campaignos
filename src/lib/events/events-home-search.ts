import { getEventDateSearchText } from "../calendar-import/date-search.ts";
import { matchesEventsHomeSummary } from "./events-home-summary.ts";
import { EVENT_TYPE_LABELS } from "../playbooks/constants.ts";
import { normalizeDateOnly, parseLocalDate } from "../utils/dates.ts";
import type { Event } from "../../types/index.ts";

export type EventsHomeSearchResponsiblePerson = {
  displayName: string;
  organizationTitle: string | null;
};

export type EventMatchesSearchOptions = {
  today: string;
  responsible?: EventsHomeSearchResponsiblePerson | null;
  schoolYearLabel?: string | null;
};

function getWeekdaySearchText(date: string): string {
  const parsed = parseLocalDate(normalizeDateOnly(date));
  return [
    parsed.toLocaleDateString("en-US", { weekday: "short" }),
    parsed.toLocaleDateString("en-US", { weekday: "long" }),
  ].join(" ");
}

function getEventStatusSearchLabel(event: Event, today: string): string {
  if (matchesEventsHomeSummary(event, "needs_follow_up", today)) {
    return "Follow-up";
  }
  if (event.status === "published") return "Published";
  if (event.status === "draft") return "Needs setup";
  if (event.status === "scheduled") return "Ready";
  return event.status;
}

function getEventTypeSearchText(event: Event): string {
  const parts: string[] = [];
  if (event.eventType) {
    parts.push(event.eventType);
    const label = EVENT_TYPE_LABELS[event.eventType];
    if (label) parts.push(label);
  }
  if (event.category) parts.push(event.category);
  return parts.join(" ");
}

export function buildEventSearchHaystack(
  event: Event,
  options: EventMatchesSearchOptions,
): string {
  const { today, responsible, schoolYearLabel } = options;
  return [
    event.title,
    event.description,
    event.location,
    getEventTypeSearchText(event),
    responsible?.displayName,
    responsible?.organizationTitle,
    getEventDateSearchText(event.date),
    getWeekdaySearchText(event.date),
    getEventStatusSearchLabel(event, today),
    event.status,
    schoolYearLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function eventMatchesSearch(
  event: Event,
  query: string,
  options: EventMatchesSearchOptions,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return buildEventSearchHaystack(event, options).includes(needle);
}

export function filterEventsHomeBySearch<T extends Event>(
  events: T[],
  query: string,
  getOptions: (event: T) => EventMatchesSearchOptions,
): T[] {
  if (!query.trim()) return events;
  return events.filter((event) =>
    eventMatchesSearch(event, query, getOptions(event)),
  );
}
