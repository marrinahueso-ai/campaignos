import {
  addDaysToDateOnly,
  normalizeDateOnly,
} from "../utils/dates.ts";
import type { Event } from "../../types/index.ts";

export type EventsHomeSummaryKey =
  | "total"
  | "active"
  | "upcoming"
  | "planning"
  | "completed";

/** Month filter: all | this_month | next_month | YYYY-MM */
export type EventsHomeMonthFilter = "all" | "this_month" | "next_month" | string;

/**
 * Summary cards are independent lenses, not a partition.
 * The same event can appear in more than one count, e.g.:
 * - a scheduled future event is both Active and Upcoming
 * - a draft in the next 60 days is both Planning and Upcoming
 * Total is the only exhaustive count of the visible list.
 */
export const EVENTS_HOME_SUMMARY_OVERLAP_NOTE =
  "Counts can overlap — cards are filters, not exclusive buckets.";

function isCompleted(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  return date < today || event.status === "published";
}

/** Same window semantics as isCampaignUpcoming in campaign-display. */
function isUpcoming(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  const windowEnd = addDaysToDateOnly(today, 60);
  return date >= today && date <= windowEnd;
}

function monthKeyFromDate(date: string): string {
  return normalizeDateOnly(date).slice(0, 7);
}

function shiftMonthKey(today: string, deltaMonths: number): string {
  const [yearText, monthText] = normalizeDateOnly(today).slice(0, 7).split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1 + deltaMonths, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Honest derived summary counts for Phase 3 Events Home.
 * Does not invent stored statuses.
 *
 * - Planning = draft
 * - Upcoming = existing isCampaignUpcoming helper semantics (today → +60 days)
 * - Completed = past event or published
 * - Active = scheduled and not completed
 * - Total = visible events in the provided list (campaign-page scope)
 *
 * These cards intentionally overlap; see EVENTS_HOME_SUMMARY_OVERLAP_NOTE.
 */
export function countEventsHomeSummary(
  events: Event[],
  today: string,
): Record<EventsHomeSummaryKey, number> {
  const counts: Record<EventsHomeSummaryKey, number> = {
    total: events.length,
    active: 0,
    upcoming: 0,
    planning: 0,
    completed: 0,
  };

  for (const event of events) {
    if (isUpcoming(event, today)) {
      counts.upcoming += 1;
    }
    if (isCompleted(event, today)) {
      counts.completed += 1;
    }
    if (event.status === "draft") {
      counts.planning += 1;
    }
    if (event.status === "scheduled" && !isCompleted(event, today)) {
      counts.active += 1;
    }
  }

  return counts;
}

export function matchesEventsHomeSummary(
  event: Event,
  summary: EventsHomeSummaryKey | "all",
  today: string,
): boolean {
  if (summary === "all" || summary === "total") {
    return true;
  }
  if (summary === "upcoming") {
    return isUpcoming(event, today);
  }
  if (summary === "completed") {
    return isCompleted(event, today);
  }
  if (summary === "planning") {
    return event.status === "draft";
  }
  if (summary === "active") {
    return event.status === "scheduled" && !isCompleted(event, today);
  }
  return true;
}

export function matchesEventsHomeMonth(
  event: Event,
  monthFilter: EventsHomeMonthFilter,
  today: string,
): boolean {
  if (monthFilter === "all") {
    return true;
  }
  const eventMonth = monthKeyFromDate(event.date);
  if (monthFilter === "this_month") {
    return eventMonth === shiftMonthKey(today, 0);
  }
  if (monthFilter === "next_month") {
    return eventMonth === shiftMonthKey(today, 1);
  }
  return eventMonth === monthFilter;
}

export function buildEventsHomeMonthFilterOptions(
  events: Event[],
  today: string,
): { value: string; label: string }[] {
  const keys = new Set<string>();
  for (const event of events) {
    keys.add(monthKeyFromDate(event.date));
  }
  const thisMonth = shiftMonthKey(today, 0);
  const nextMonth = shiftMonthKey(today, 1);

  return [
    { value: "all", label: "All Dates" },
    { value: "this_month", label: "This Month" },
    { value: "next_month", label: "Next Month" },
    ...[...keys]
      .sort((left, right) => left.localeCompare(right))
      .filter((key) => key !== thisMonth && key !== nextMonth)
      .map((key) => ({ value: key, label: formatMonthLabel(key) })),
  ];
}

export const EVENTS_HOME_SUMMARY_CARDS: {
  key: EventsHomeSummaryKey;
  label: string;
}[] = [
  { key: "total", label: "Total Events" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "planning", label: "Planning" },
  { key: "completed", label: "Completed" },
];
