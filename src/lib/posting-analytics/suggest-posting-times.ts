import { getScoreForCell } from "@/lib/posting-analytics/compute-heatmap";
import { formatHourLabel, heatmapSourceLabel } from "@/lib/posting-analytics/heatmap-ui";
import { getDayOfWeekInTimezone } from "@/lib/posting-analytics/timezone-utils";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";

const DEFAULT_SUGGESTED_HOUR = 10;
const SEARCH_START_HOUR = 6;
const SEARCH_END_HOUR = 21;

export function formatScheduleTimeFromHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function resolveBestHourForDate(
  heatmap: PostingHeatmapData | null | undefined,
  dateOnly: string,
  fallbackHour = DEFAULT_SUGGESTED_HOUR,
): number {
  if (!heatmap || !dateOnly) {
    return fallbackHour;
  }

  const dayOfWeek = getDayOfWeekInTimezone(
    `${dateOnly.slice(0, 10)}T12:00:00`,
    heatmap.timezone,
  );

  let bestHour = fallbackHour;
  let bestScore = -1;

  for (let hour = SEARCH_START_HOUR; hour <= SEARCH_END_HOUR; hour += 1) {
    const score = getScoreForCell(heatmap.scores, dayOfWeek, hour);
    if (score > bestScore) {
      bestScore = score;
      bestHour = hour;
    }
  }

  return bestHour;
}

export function resolveSuggestedHourRange(
  heatmap: PostingHeatmapData | null | undefined,
): { startHour: number; endHour: number } {
  if (!heatmap) {
    return { startHour: 9, endHour: 11 };
  }

  let peakHour = DEFAULT_SUGGESTED_HOUR;
  let peakScore = -1;

  for (let day = 0; day < 7; day += 1) {
    for (let hour = SEARCH_START_HOUR; hour <= SEARCH_END_HOUR; hour += 1) {
      const score = getScoreForCell(heatmap.scores, day, hour);
      if (score > peakScore) {
        peakScore = score;
        peakHour = hour;
      }
    }
  }

  const startHour = Math.max(SEARCH_START_HOUR, peakHour - 1);
  const endHour = Math.min(SEARCH_END_HOUR, peakHour + 1);
  return { startHour, endHour };
}

export function buildSmartSuggestionMessage(
  heatmap: PostingHeatmapData | null | undefined,
): string {
  const { startHour, endHour } = resolveSuggestedHourRange(heatmap);
  const windowLabel =
    startHour === endHour
      ? formatHourLabel(startHour)
      : `${formatHourLabel(startHour)}–${formatHourLabel(endHour)}`;

  if (!heatmap) {
    return `Based on similar campaigns, posting around ${windowLabel} gets the most engagement.`;
  }

  const sourceLabel = heatmapSourceLabel(heatmap).toLowerCase();
  return `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} — posting around ${windowLabel} gets the most engagement.`;
}
