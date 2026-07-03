import type { PreferredPostingWindow } from "@/types/posting-preferences";
import {
  getDayOfWeekInTimezone,
  getHourInTimezone,
} from "@/lib/posting-analytics/timezone-utils";
import type {
  PostingHeatmapData,
  PostingHeatmapSource,
  PostingTimeScoreGrid,
} from "@/lib/posting-analytics/types";

const DAYS = 7;
const HOURS = 24;

function emptyGrid(): PostingTimeScoreGrid {
  return Array.from({ length: DAYS }, () => Array(HOURS).fill(0));
}

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function setWindowScores(
  grid: PostingTimeScoreGrid,
  window: PreferredPostingWindow,
  score: number,
): void {
  for (const day of window.daysOfWeek) {
    if (day < 0 || day > 6) {
      continue;
    }

    for (let hour = window.startHour; hour <= window.endHour; hour += 1) {
      if (hour < 0 || hour > 23) {
        continue;
      }
      grid[day]![hour] = Math.max(grid[day]![hour]!, score);
    }
  }
}

/** PTO default: weekday evenings 5–8pm high; de-emphasize early morning. */
function applyPtoHeuristic(grid: PostingTimeScoreGrid): void {
  const weekdayEvenings: PreferredPostingWindow = {
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 17,
    endHour: 20,
  };
  setWindowScores(grid, weekdayEvenings, 1);

  const weekdayAfternoons: PreferredPostingWindow = {
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 12,
    endHour: 16,
  };
  setWindowScores(grid, weekdayAfternoons, 0.45);

  const weekendMidday: PreferredPostingWindow = {
    daysOfWeek: [0, 6],
    startHour: 10,
    endHour: 14,
  };
  setWindowScores(grid, weekendMidday, 0.55);

  for (let day = 0; day < DAYS; day += 1) {
    for (let hour = 0; hour < 6; hour += 1) {
      grid[day]![hour] = clampScore(Math.min(grid[day]![hour]!, 0.08));
    }
  }
}

function applyManualWindows(
  grid: PostingTimeScoreGrid,
  windows: PreferredPostingWindow[],
): void {
  for (const window of windows) {
    setWindowScores(grid, window, 1);

    for (const day of window.daysOfWeek) {
      if (day < 0 || day > 6) {
        continue;
      }

      const before = window.startHour - 1;
      if (before >= 0 && before <= 23) {
        grid[day]![before] = Math.max(grid[day]![before]!, 0.35);
      }

      const after = window.endHour + 1;
      if (after >= 0 && after <= 23) {
        grid[day]![after] = Math.max(grid[day]![after]!, 0.35);
      }
    }
  }

  for (let day = 0; day < DAYS; day += 1) {
    for (let hour = 0; hour < 6; hour += 1) {
      if (grid[day]![hour]! < 0.2) {
        grid[day]![hour] = 0.08;
      }
    }
  }
}

function buildBaselineGrid(
  preferredPostingHours: PreferredPostingWindow[] | null,
): PostingTimeScoreGrid {
  const grid = emptyGrid();
  const hasManual =
    preferredPostingHours !== null && preferredPostingHours.length > 0;

  if (hasManual) {
    applyManualWindows(grid, preferredPostingHours!);
  } else {
    applyPtoHeuristic(grid);
  }

  return grid;
}

function buildHistoryGrid(
  publishedAtTimestamps: string[],
  timezone: string,
): PostingTimeScoreGrid {
  const counts = emptyGrid();
  let maxCount = 0;

  for (const timestamp of publishedAtTimestamps) {
    const day = getDayOfWeekInTimezone(timestamp, timezone);
    const hour = getHourInTimezone(timestamp, timezone);
    counts[day]![hour]! += 1;
    maxCount = Math.max(maxCount, counts[day]![hour]!);
  }

  if (maxCount === 0) {
    return emptyGrid();
  }

  const grid = emptyGrid();
  for (let day = 0; day < DAYS; day += 1) {
    for (let hour = 0; hour < HOURS; hour += 1) {
      grid[day]![hour] = counts[day]![hour]! / maxCount;
    }
  }

  return grid;
}

function historyWeightForPostCount(postCount: number): number {
  if (postCount <= 0) {
    return 0;
  }

  if (postCount < 6) {
    return 0.6;
  }

  return 0.8;
}

function mergeGrids(
  historyGrid: PostingTimeScoreGrid,
  baselineGrid: PostingTimeScoreGrid,
  historyWeight: number,
): PostingTimeScoreGrid {
  const baselineWeight = 1 - historyWeight;
  const merged = emptyGrid();

  for (let day = 0; day < DAYS; day += 1) {
    for (let hour = 0; hour < HOURS; hour += 1) {
      merged[day]![hour] = clampScore(
        historyWeight * historyGrid[day]![hour]! +
          baselineWeight * baselineGrid[day]![hour]!,
      );
    }
  }

  return merged;
}

function resolveHeatmapSource(
  postCount: number,
  hasManual: boolean,
): PostingHeatmapSource {
  if (postCount > 0 && hasManual) {
    return "blended";
  }

  if (postCount > 0) {
    return "history";
  }

  return hasManual ? "manual" : "suggested";
}

export function computePostingHeatmap(input: {
  preferredPostingHours: PreferredPostingWindow[] | null;
  timezone: string;
  publishedAtTimestamps?: string[];
}): PostingHeatmapData {
  const hasManual =
    input.preferredPostingHours !== null && input.preferredPostingHours.length > 0;
  const publishedAtTimestamps = input.publishedAtTimestamps ?? [];
  const postCount = publishedAtTimestamps.length;

  const baselineGrid = buildBaselineGrid(input.preferredPostingHours);
  const historyGrid = buildHistoryGrid(publishedAtTimestamps, input.timezone);
  const historyWeight = historyWeightForPostCount(postCount);
  const scores =
    historyWeight > 0
      ? mergeGrids(historyGrid, baselineGrid, historyWeight)
      : baselineGrid;

  return {
    timezone: input.timezone,
    scores,
    source: resolveHeatmapSource(postCount, hasManual),
    postCount,
  };
}

export function getScoreForCell(
  scores: PostingTimeScoreGrid,
  dayOfWeek: number,
  hour: number,
): number {
  return scores[dayOfWeek]?.[hour] ?? 0;
}
