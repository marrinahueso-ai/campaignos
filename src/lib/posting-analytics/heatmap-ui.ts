import { getHourInTimezone } from "@/lib/posting-analytics/timezone-utils";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";

/** Background tint for heatmap cells — darker accent = higher score. */
export function heatmapCellBackground(score: number): string | undefined {
  if (score <= 0) {
    return undefined;
  }

  const opacity = 0.08 + score * 0.42;
  // rgba avoids color-mix + CSS variable issues in inline styles across browsers
  return `rgba(184, 149, 111, ${opacity.toFixed(2)})`;
}

export function heatmapDropTargetBackground(): string {
  return "rgba(184, 149, 111, 0.12)";
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
