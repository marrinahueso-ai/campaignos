/**
 * Pure helpers that map Meta Graph insight metric names into CampignOS fields.
 * Kept separate from fetch so unit tests can cover mapping without network I/O.
 */

export type NormalizedDailyInsight = {
  date: string;
  views: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  rawMetrics: Record<string, number>;
};

export type NormalizedPostInsight = {
  views: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  rawMetrics: Record<string, number>;
};

export type InsightValueRow = {
  name?: string;
  period?: string;
  values?: Array<{ value?: number | Record<string, number>; end_time?: string }>;
  total_value?: {
    value?: number;
    breakdowns?: Array<{
      results?: Array<{ value?: number; end_time?: string }>;
    }>;
  };
};

export function readMetricValue(
  value: number | Record<string, number> | undefined,
): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value).reduce((sum, entry) => sum + (Number(entry) || 0), 0);
  }

  return 0;
}

function metricAmountForDate(row: InsightValueRow, date: string): number | null {
  for (const entry of row.values ?? []) {
    const endTime = entry.end_time;
    if (!endTime || endTime.slice(0, 10) !== date) {
      continue;
    }
    return readMetricValue(entry.value);
  }

  for (const breakdown of row.total_value?.breakdowns ?? []) {
    for (const result of breakdown.results ?? []) {
      const endTime = result.end_time;
      if (!endTime || endTime.slice(0, 10) !== date) {
        continue;
      }
      return readMetricValue(result.value);
    }
  }

  return null;
}

function collectDatesFromRows(rows: InsightValueRow[]): string[] {
  const dates = new Set<string>();

  for (const row of rows) {
    for (const entry of row.values ?? []) {
      if (entry.end_time) {
        dates.add(entry.end_time.slice(0, 10));
      }
    }

    for (const breakdown of row.total_value?.breakdowns ?? []) {
      for (const result of breakdown.results ?? []) {
        if (result.end_time) {
          dates.add(result.end_time.slice(0, 10));
        }
      }
    }
  }

  return [...dates].sort((a, b) => a.localeCompare(b));
}

/** True for total (non-unique) media view metrics Meta surfaces as "Views". */
export function isTotalMediaViewMetric(metricName: string): boolean {
  if (!metricName.includes("media_view")) {
    return false;
  }
  return !metricName.includes("unique");
}

/** True for unique view / reach-style metrics. */
export function isReachMetric(metricName: string): boolean {
  return (
    metricName.includes("media_view_unique") ||
    metricName.includes("impressions_unique") ||
    metricName === "reach" ||
    metricName === "impressions"
  );
}

export function applyMetricToTotals(
  current: {
    views: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    rawMetrics: Record<string, number>;
  },
  metricName: string,
  amount: number,
): void {
  current.rawMetrics[metricName] = amount;

  if (isTotalMediaViewMetric(metricName)) {
    current.views += amount;
  } else if (isReachMetric(metricName)) {
    current.reach += amount;
  } else if (metricName.includes("engagement") || metricName.includes("engaged")) {
    current.engagement += amount;
  } else if (metricName.includes("reactions_like") || metricName === "likes") {
    current.likes += amount;
  } else if (metricName.includes("comment") || metricName === "replies") {
    current.comments += amount;
  } else if (metricName.includes("share")) {
    current.shares += amount;
  } else if (metricName.includes("click")) {
    current.clicks += amount;
  } else if (metricName === "total_interactions") {
    current.engagement += amount;
  }
}

export function parseDailyInsights(rows: InsightValueRow[]): NormalizedDailyInsight[] {
  const dates = collectDatesFromRows(rows);
  const byDate = new Map<string, NormalizedDailyInsight>();

  for (const date of dates) {
    const current: NormalizedDailyInsight = {
      date,
      views: 0,
      reach: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      rawMetrics: {},
    };

    for (const row of rows) {
      const metricName = row.name ?? "";
      const amount = metricAmountForDate(row, date);
      if (amount == null) {
        continue;
      }
      applyMetricToTotals(current, metricName, amount);
    }

    // When Meta only returns unique reach (e.g. Instagram), treat reach as views.
    if (current.views <= 0 && current.reach > 0) {
      current.views = current.reach;
    }

    byDate.set(date, current);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function parsePostInsights(rows: InsightValueRow[]): NormalizedPostInsight {
  const current: NormalizedPostInsight = {
    views: 0,
    reach: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0,
    rawMetrics: {},
  };

  for (const row of rows) {
    const metricName = row.name ?? "";
    const amount =
      readMetricValue(row.values?.[0]?.value) ||
      readMetricValue(row.total_value?.value);
    applyMetricToTotals(current, metricName, amount);
  }

  if (current.views <= 0 && current.reach > 0) {
    current.views = current.reach;
  }

  // Facebook post insights have no engagement metric — derive from reactions.
  if (current.engagement <= 0) {
    current.engagement = current.likes + current.comments + current.shares;
  }

  return current;
}

/** Prefer stored total views from raw Graph payload; fall back to unique reach. */
export function extractViewsFromRawMetrics(
  rawMetrics: Record<string, unknown> | null | undefined,
  reachFallback: number,
): number {
  if (!rawMetrics || typeof rawMetrics !== "object") {
    return reachFallback;
  }

  for (const key of ["page_media_view", "post_media_view", "views"] as const) {
    const value = Number(rawMetrics[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return reachFallback;
}

/** Soft engagement snapshot when post insights metrics are unavailable. */
export function engagementFallbackInsight(input: {
  likes: number;
  comments: number;
  shares: number;
}): NormalizedPostInsight {
  const likes = Number(input.likes) || 0;
  const comments = Number(input.comments) || 0;
  const shares = Number(input.shares) || 0;
  return {
    views: 0,
    reach: 0,
    engagement: likes + comments + shares,
    likes,
    comments,
    shares,
    clicks: 0,
    rawMetrics: {
      engagement_fallback: 1,
      likes,
      comments,
      shares,
    },
  };
}

/** Caption / artwork stored on post insight rows for carousel cards. */
export function extractPostDisplayFields(
  rawMetrics: Record<string, unknown> | null | undefined,
): { caption: string | null; thumbnailUrl: string | null } {
  if (!rawMetrics || typeof rawMetrics !== "object") {
    return { caption: null, thumbnailUrl: null };
  }

  const caption =
    typeof rawMetrics.caption === "string" && rawMetrics.caption.trim()
      ? rawMetrics.caption
      : null;
  const thumbnailUrl =
    typeof rawMetrics.thumbnail_url === "string" &&
    rawMetrics.thumbnail_url.trim()
      ? rawMetrics.thumbnail_url
      : null;

  return { caption, thumbnailUrl };
}
