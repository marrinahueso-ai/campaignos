import { formatEventTime } from "@/lib/utils/dates";

/** Format a short date for change chips (e.g. Sept 18). */
export function formatSyncReviewShortDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatSyncReviewTime(value: string | null | undefined): string {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return "No time";
  }
  return formatEventTime(trimmed) ?? trimmed;
}

export function formatSyncReviewLocation(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() || "";
  return trimmed || "No location";
}
