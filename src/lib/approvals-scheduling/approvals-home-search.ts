import { approvalOutcomeChip } from "./outcome-display.ts";
import type { UnifiedApprovalItem } from "./types.ts";
import {
  formatEventDate,
  normalizeDateOnly,
  parseLocalDate,
} from "../utils/dates.ts";

const WORKFLOW_STATUS_SEARCH_LABELS: Record<
  UnifiedApprovalItem["workflowStatus"],
  string
> = {
  in_queue: "in queue",
  assigned_to_me: "assigned to me",
  changes_requested: "changes requested",
  scheduled: "scheduled",
  posted: "posted",
  published: "published",
  failed: "failed",
};

const PULSE_SEARCH_ALIASES: Record<
  UnifiedApprovalItem["workflowStatus"],
  string
> = {
  in_queue: "needs you waiting",
  assigned_to_me: "needs you assigned to me",
  changes_requested: "changes edits fix",
  scheduled: "on the calendar scheduled",
  posted: "already live posted",
  published: "already live posted published",
  failed: "retry failed",
};

function deliverySearchLabel(
  method: UnifiedApprovalItem["deliveryMethod"],
): string {
  switch (method) {
    case "publish-now":
    case "auto-publish":
      return "publish now";
    case "schedule":
      return "scheduled";
    case "manual-email":
      return "email post kit manual email";
    case "draft-only":
      return "draft drafts";
    default:
      return "";
  }
}

function platformSearchLabels(
  platforms: UnifiedApprovalItem["platforms"],
): string[] {
  return platforms.flatMap((platform) => {
    switch (platform) {
      case "facebook":
        return ["facebook", "fb"];
      case "instagram":
        return ["instagram", "ig"];
      case "email":
        return ["email"];
      default:
        return [];
    }
  });
}

function getApprovalDateSearchText(date: string): string {
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

function weekdaySearchText(isoDate: string): string {
  const dateOnly = normalizeDateOnly(isoDate.slice(0, 10));
  const parsed = parseLocalDate(dateOnly);
  return [
    parsed.toLocaleDateString("en-US", { weekday: "short" }),
    parsed.toLocaleDateString("en-US", { weekday: "long" }),
  ].join(" ");
}

function dateSearchTokens(isoDate: string | null): string {
  if (!isoDate?.trim()) {
    return "";
  }
  const dateOnly = normalizeDateOnly(isoDate.slice(0, 10));
  return [getApprovalDateSearchText(dateOnly), weekdaySearchText(dateOnly)].join(
    " ",
  );
}

/** Pulse tabs filter the list only when search is empty (Events Home pattern). */
export function shouldApplyApprovalsEasePulseFilter(query: string): boolean {
  return !query.trim();
}

export function buildApprovalSearchHaystack(
  item: UnifiedApprovalItem,
): string {
  const caption =
    item.preview.captionText?.trim() ||
    item.preview.storyCaptionSnippet?.trim() ||
    "";
  const historyText = item.approvalHistory
    .flatMap((entry) => [entry.actor, entry.label])
    .join(" ");

  return [
    item.eventTitle,
    item.campaignName,
    item.milestoneName,
    caption,
    item.workflowStatus,
    WORKFLOW_STATUS_SEARCH_LABELS[item.workflowStatus],
    PULSE_SEARCH_ALIASES[item.workflowStatus],
    approvalOutcomeChip(item).label,
    item.statusDetail,
    item.assigneeName,
    item.assigneeRole,
    item.assigneeInitials,
    item.submittedByMe ? "you creator submitted" : "creator",
    item.nextAction,
    item.nextActionTime,
    item.deliveryMethod ?? "",
    deliverySearchLabel(item.deliveryMethod),
    ...platformSearchLabels(item.platforms),
    item.scheduleLabel ?? "",
    item.scheduleAt ?? "",
    dateSearchTokens(item.scheduleAt),
    dateSearchTokens(item.requestedAt),
    item.notes ?? "",
    item.publishError ?? "",
    historyText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function approvalMatchesSearch(
  item: UnifiedApprovalItem,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return buildApprovalSearchHaystack(item).includes(needle);
}

export function filterApprovalsBySearch(
  items: UnifiedApprovalItem[],
  query: string,
): UnifiedApprovalItem[] {
  if (!query.trim()) {
    return items;
  }
  return items.filter((item) => approvalMatchesSearch(item, query));
}
