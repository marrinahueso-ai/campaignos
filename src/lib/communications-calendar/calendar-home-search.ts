import {
  formatEventDate,
  formatDateTime,
  normalizeDateOnly,
  parseLocalDate,
} from "../utils/dates.ts";
import type { PlanningCalendarItem } from "../../types/communications-calendar.ts";

const DISPLAY_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  overdue: "Overdue",
};

function weekdaySearchText(date: string): string {
  const parsed = parseLocalDate(normalizeDateOnly(date));
  return [
    parsed.toLocaleDateString("en-US", { weekday: "short" }),
    parsed.toLocaleDateString("en-US", { weekday: "long" }),
  ].join(" ");
}

function getCalendarDateSearchText(date: string): string {
  const normalized = normalizeDateOnly(date);
  const parsed = parseLocalDate(normalized);
  const year = String(parsed.getFullYear());
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const monthPadded = String(month).padStart(2, "0");
  const dayPadded = String(day).padStart(2, "0");
  const shortMonth = parsed.toLocaleDateString("en-US", { month: "short" });
  const longMonth = parsed.toLocaleDateString("en-US", { month: "long" });
  const formatted = formatEventDate(normalized);

  return [
    normalized,
    formatted,
    year,
    shortMonth,
    longMonth,
    `${monthPadded}/${dayPadded}`,
    `${month}/${day}`,
    `${monthPadded}/${dayPadded}/${year}`,
    `${month}/${day}/${year}`,
    `${year}-${monthPadded}`,
    `${shortMonth} ${day}`,
    `${longMonth} ${day}`,
    `${shortMonth} ${day}, ${year}`,
    `${longMonth} ${day}, ${year}`,
    `${shortMonth} ${dayPadded}`,
    `${longMonth} ${dayPadded}`,
  ]
    .join(" ")
    .toLowerCase();
}

function getTimeSearchText(scheduledAt: string | null | undefined): string {
  if (!scheduledAt?.trim()) {
    return "";
  }

  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const withMinutes = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const compact = withMinutes.replace(" ", "").toLowerCase();
  const noMinutes = compact.replace(":00", "");
  const hourOnly = date
    .toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
    .toLowerCase();

  return [
    withMinutes,
    withMinutes.toLowerCase(),
    compact,
    noMinutes,
    hourOnly,
    formatDateTime(scheduledAt),
  ].join(" ");
}

function isMetaMilestoneItem(item: PlanningCalendarItem): boolean {
  return item.communicationType === "meta_milestone";
}

function getDisplayStatus(
  item: PlanningCalendarItem & { isOverdue?: boolean },
): string {
  if (item.isOverdue) {
    return "overdue";
  }

  if (item.publishStatus === "published" || item.status === "published") {
    return "published";
  }

  if (
    item.communicationType === "meta_milestone" ||
    item.publishStatus === "scheduled" ||
    item.status === "scheduled"
  ) {
    return "scheduled";
  }

  return "draft";
}

function getCalendarItemDisplayTitle(item: PlanningCalendarItem): string {
  if (isMetaMilestoneItem(item)) {
    const milestone =
      item.timelineStepTitle ??
      item.title.replace(/\s*[—-]\s*Meta\s*$/i, "").trim();
    return `${item.eventTitle} - ${milestone}`;
  }

  return item.title;
}

export function buildCalendarItemSearchHaystack(
  item: PlanningCalendarItem & { isOverdue?: boolean },
): string {
  const displayStatus = getDisplayStatus(item);
  const displayTitle = getCalendarItemDisplayTitle(item);
  const channelLabel = item.communicationType === "event" ? "Event" : null;

  return [
    item.eventTitle,
    item.title,
    displayTitle,
    item.timelineStepTitle,
    item.draftContent,
    item.assignedUser,
    item.channel,
    channelLabel,
    item.status,
    item.draftStatus,
    item.artworkStatus,
    item.approvalStatus,
    item.publishStatus,
    displayStatus,
    DISPLAY_STATUS_LABELS[displayStatus],
    item.communicationType,
    item.sourceType,
    getCalendarDateSearchText(item.scheduledDate),
    weekdaySearchText(item.scheduledDate),
    getTimeSearchText(item.scheduledAt),
    item.scheduledAt,
    "events",
    "scheduled posts",
    "scheduled",
    "published",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function calendarItemMatchesSearch(
  item: PlanningCalendarItem & { isOverdue?: boolean },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return buildCalendarItemSearchHaystack(item).includes(needle);
}

export function filterCalendarItemsBySearch<T extends PlanningCalendarItem>(
  items: T[],
  query: string,
): T[] {
  if (!query.trim()) {
    return items;
  }
  return items.filter((item) => calendarItemMatchesSearch(item, query));
}

/**
 * When search matches items, jump Month/Week to the soonest upcoming match
 * (prefer school events over posts). Falls back to the earliest match.
 */
export function pickCalendarSearchFocusItem<T extends PlanningCalendarItem>(
  matches: T[],
  today: string,
): T | null {
  if (matches.length === 0) {
    return null;
  }

  const events = matches.filter((item) => item.communicationType === "event");
  const pool = events.length > 0 ? events : matches;
  const sorted = [...pool].sort((left, right) =>
    normalizeDateOnly(left.scheduledDate).localeCompare(
      normalizeDateOnly(right.scheduledDate),
    ),
  );
  const upcoming = sorted.find(
    (item) => normalizeDateOnly(item.scheduledDate) >= today,
  );
  return upcoming ?? sorted[0] ?? null;
}

export function calendarFocusFromItem(item: PlanningCalendarItem): {
  year: number;
  month: number;
  weekAnchor: string;
} {
  const date = parseLocalDate(normalizeDateOnly(item.scheduledDate));
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    weekAnchor: normalizeDateOnly(item.scheduledDate),
  };
}

export function preferSearchMatches<T extends { id: string }>(
  items: T[],
  highlightedIds: ReadonlySet<string> | null | undefined,
): T[] {
  if (!highlightedIds || highlightedIds.size === 0) {
    return items;
  }
  return [...items].sort((left, right) => {
    const leftHit = highlightedIds.has(left.id) ? 0 : 1;
    const rightHit = highlightedIds.has(right.id) ? 0 : 1;
    return leftHit - rightHit;
  });
}
