import type { CalmStatusKey } from "@/lib/design-system/status-colors";
import { getHourInTimezone } from "@/lib/posting-analytics/timezone-utils";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";

/** Left accent when chips sit on tan heatmap cells — keeps status readable on white. */
export const HEATMAP_CHIP_STATUS_ACCENT: Record<CalmStatusKey, string> = {
  draft: "border-l-cos-muted/60",
  needs_review: "border-l-cos-warning-text",
  approved: "border-l-cos-accent",
  scheduled: "border-l-cos-accent",
  published: "border-l-cos-success",
  overdue: "border-l-cos-error",
};

/** Solid card surface so event chips pop over heatmap tint. */
export function heatmapChipElevatedClasses(status: CalmStatusKey): string {
  return [
    "border-l-[3px] bg-white shadow-sm ring-1 ring-cos-border/90",
    HEATMAP_CHIP_STATUS_ACCENT[status],
  ].join(" ");
}

/** Background tint for heatmap cells — darker accent = higher score. */
export function heatmapCellBackground(score: number): string | undefined {
  if (score <= 0) {
    return undefined;
  }

  // Match legend steps (accent-soft → /40 → /70 → full) on white cells.
  const opacity = 0.22 + score * 0.58;
  // Pre-blend on white so cells read as solid tan/amber in screenshots and video.
  const alpha = Math.min(1, opacity);
  const r = Math.round(184 * alpha + 255 * (1 - alpha));
  const g = Math.round(149 * alpha + 255 * (1 - alpha));
  const b = Math.round(111 * alpha + 255 * (1 - alpha));
  return `rgb(${r}, ${g}, ${b})`;
}

export function heatmapDropTargetBackground(): string {
  return "rgb(232, 223, 210)";
}

export function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });
}

export function resolveItemHour(
  item: { scheduledAt?: string | null },
  timezone: string,
): number | null {
  if (!item.scheduledAt) {
    return null;
  }

  return getHourInTimezone(item.scheduledAt, timezone);
}

export function heatmapSourceLabel(heatmap: PostingHeatmapData | null): string {
  if (!heatmap) {
    return "Suggested schedule";
  }

  if (heatmap.postCount > 0) {
    const postLabel =
      heatmap.postCount === 1
        ? "Based on 1 post"
        : `Based on ${heatmap.postCount} posts`;

    if (heatmap.source === "blended") {
      return `${postLabel} + your preferences`;
    }

    return postLabel;
  }

  return heatmap.source === "manual" ? "Your preferred times" : "Suggested schedule";
}
