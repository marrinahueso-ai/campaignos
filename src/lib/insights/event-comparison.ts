/**
 * Pure helpers for event-scoped Insights comparison + publish-day series.
 * Kept free of I/O so unit tests can cover edge cases without Supabase.
 */

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compare event total views to typical = median(per-post views) × post count.
 * Requires ≥2 posts; returns null when totals match (no meaningful direction).
 */
export function buildEventViewsComparison(postViews: number[]): {
  direction: "more" | "fewer";
  typicalTotal: number;
  actualTotal: number;
  medianViews: number;
} | null {
  if (postViews.length < 2) {
    return null;
  }

  const medianViews = median(postViews);
  if (medianViews == null) {
    return null;
  }

  const actualTotal = postViews.reduce((sum, value) => sum + value, 0);
  const typicalTotal = medianViews * postViews.length;
  if (actualTotal === typicalTotal) {
    return null;
  }

  return {
    direction: actualTotal > typicalTotal ? "more" : "fewer",
    typicalTotal,
    actualTotal,
    medianViews,
  };
}

export type PublishDayViewsInput = {
  publishedAt: string | null;
  views: number;
};

/**
 * Build cumulative views series at real publish days only (no interpolated days).
 * Typical line = median views × posts published on or before that day.
 */
export function buildEventViewsSeries(
  posts: PublishDayViewsInput[],
): Array<{
  date: string;
  dayIndex: number;
  eventViews: number;
  typicalViews: number;
}> | null {
  const dated = posts
    .map((post) => {
      const date = post.publishedAt?.slice(0, 10) ?? null;
      if (!date) {
        return null;
      }
      return { date, views: Number(post.views) || 0 };
    })
    .filter((entry): entry is { date: string; views: number } => entry != null);

  if (dated.length < 2) {
    return null;
  }

  const allViews = dated.map((entry) => entry.views);
  const medianViews = median(allViews) ?? 0;

  const byDate = new Map<string, number>();
  for (const entry of dated) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.views);
  }

  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  if (dates.length < 2) {
    return null;
  }

  let cumulative = 0;
  let postsThrough = 0;
  return dates.map((date, index) => {
    const dayViews = byDate.get(date) ?? 0;
    const postsOnDay = dated.filter((entry) => entry.date === date).length;
    cumulative += dayViews;
    postsThrough += postsOnDay;
    return {
      date,
      dayIndex: index + 1,
      eventViews: cumulative,
      typicalViews: medianViews * postsThrough,
    };
  });
}
