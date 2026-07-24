import {
  addDaysToDateOnly,
  normalizeDateOnly,
} from "../utils/dates.ts";
import type { Event } from "../../types/index.ts";

/** Action / “what needs me” summary lenses on Events Home. */
export type EventsHomeSummaryKey =
  | "next_60_days"
  | "needs_setup"
  | "ready_to_run"
  | "needs_follow_up"
  | "done";

/** Month filter: all | this_month | next_month | YYYY-MM */
export type EventsHomeMonthFilter = "all" | "this_month" | "next_month" | string;

/**
 * Summary cards are independent lenses, not a partition.
 * The same event can appear in more than one count, e.g.:
 * - a draft in the next 60 days is both Next 60 days and Needs setup
 * - a scheduled event next month is both Next 60 days and Ready to run
 */
export const EVENTS_HOME_SUMMARY_OVERLAP_NOTE =
  "Cards are filters; an event can match more than one.";

/** Same window semantics as isCampaignUpcoming in campaign-display. */
function isNext60Days(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  const windowEnd = addDaysToDateOnly(today, 60);
  return date >= today && date <= windowEnd;
}

function isNeedsSetup(event: Event): boolean {
  return event.status === "draft";
}

function isReadyToRun(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  return event.status === "scheduled" && date >= today;
}

function isNeedsFollowUp(event: Event, today: string): boolean {
  const date = normalizeDateOnly(event.date);
  return date < today && event.status !== "published";
}

function isDone(event: Event): boolean {
  return event.status === "published";
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
 * Action-oriented summary counts for Phase 3 Events Home.
 * Does not invent stored statuses beyond draft / scheduled / published.
 *
 * - Next 60 days = today → +60 days (date window)
 * - Needs setup = draft
 * - Ready to run = scheduled and date still ahead
 * - Needs follow-up = past date and not published
 * - Done = published
 *
 * These cards intentionally overlap; see EVENTS_HOME_SUMMARY_OVERLAP_NOTE.
 */
export function countEventsHomeSummary(
  events: Event[],
  today: string,
): Record<EventsHomeSummaryKey, number> {
  const counts: Record<EventsHomeSummaryKey, number> = {
    next_60_days: 0,
    needs_setup: 0,
    ready_to_run: 0,
    needs_follow_up: 0,
    done: 0,
  };

  for (const event of events) {
    if (isNext60Days(event, today)) {
      counts.next_60_days += 1;
    }
    if (isNeedsSetup(event)) {
      counts.needs_setup += 1;
    }
    if (isReadyToRun(event, today)) {
      counts.ready_to_run += 1;
    }
    if (isNeedsFollowUp(event, today)) {
      counts.needs_follow_up += 1;
    }
    if (isDone(event)) {
      counts.done += 1;
    }
  }

  return counts;
}

export function matchesEventsHomeSummary(
  event: Event,
  summary: EventsHomeSummaryKey | "all",
  today: string,
): boolean {
  if (summary === "all") {
    return true;
  }
  if (summary === "next_60_days") {
    return isNext60Days(event, today);
  }
  if (summary === "needs_setup") {
    return isNeedsSetup(event);
  }
  if (summary === "ready_to_run") {
    return isReadyToRun(event, today);
  }
  if (summary === "needs_follow_up") {
    return isNeedsFollowUp(event, today);
  }
  if (summary === "done") {
    return isDone(event);
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
  { key: "next_60_days", label: "Next 60 Days" },
  { key: "needs_setup", label: "Needs Setup" },
  { key: "ready_to_run", label: "Ready to Run" },
  { key: "needs_follow_up", label: "Needs Follow-up" },
  { key: "done", label: "Done" },
];

/** Default selected card on Events Home (action horizon). */
export const EVENTS_HOME_DEFAULT_SUMMARY: EventsHomeSummaryKey = "next_60_days";
