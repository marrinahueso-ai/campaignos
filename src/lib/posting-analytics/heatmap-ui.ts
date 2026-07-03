import { getHourInTimezone } from "@/lib/posting-analytics/timezone-utils";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";

/** Background mix for heatmap cells — darker accent = higher score. */
export function heatmapCellBackground(score: number): string | undefined {
  if (score <= 0) {
    return undefined;
  }

  const opacity = 0.08 + score * 0.42;
  return `color-mix(in srgb, var(--cos-accent) ${Math.round(opacity * 100)}%, transparent)`;
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

  return heatmap.source === "manual" ? "Your preferred times" : "Suggested schedule";
}
