import type {
  InsightsContentBreakdownItem,
  InsightsKpi,
  InsightsPlatformTotals,
  InsightsRecommendation,
  InsightsTopPost,
} from "@/lib/insights/types";

type PostBreakdownInput = {
  platform: "facebook" | "instagram";
  placement: "feed" | "story" | null;
  engagement: number;
};

const CONTENT_LABELS: Record<string, string> = {
  "facebook:feed": "Facebook feed",
  "facebook:story": "Facebook stories",
  "instagram:feed": "Instagram feed",
  "instagram:story": "Instagram stories",
};

export function buildContentBreakdownFromPosts(
  posts: PostBreakdownInput[],
): InsightsContentBreakdownItem[] {
  const counts = new Map<string, { count: number; engagement: number }>();

  for (const post of posts) {
    const placement = post.placement ?? "feed";
    const key = `${post.platform}:${placement}`;
    const current = counts.get(key) ?? { count: 0, engagement: 0 };
    current.count += 1;
    current.engagement += Number(post.engagement) || 0;
    counts.set(key, current);
  }

  if (counts.size === 0) {
    return [];
  }

  const totalEngagement = [...counts.values()].reduce(
    (sum, entry) => sum + entry.engagement,
    0,
  );
  const totalCount = [...counts.values()].reduce((sum, entry) => sum + entry.count, 0);
  const useEngagement = totalEngagement > 0;

  return [...counts.entries()]
    .map(([key, stats]) => ({
      label: CONTENT_LABELS[key] ?? key,
      count: stats.count,
      engagement: stats.engagement,
      percent: useEngagement
        ? Math.round((stats.engagement / totalEngagement) * 100)
        : Math.round((stats.count / totalCount) * 100),
    }))
    .sort((a, b) => b.engagement - a.engagement || b.count - a.count);
}

export function buildInsightsRecommendation(input: {
  kpis: InsightsKpi[];
  contentBreakdown: InsightsContentBreakdownItem[];
  platformComparison: InsightsPlatformTotals[];
  topPosts: InsightsTopPost[];
  hasAnyMetrics: boolean;
}): InsightsRecommendation | null {
  if (!input.hasAnyMetrics) {
    return null;
  }

  const engagementKpi = input.kpis.find((kpi) => kpi.key === "engagement");
  const reachKpi = input.kpis.find((kpi) => kpi.key === "reach");
  const likesKpi = input.kpis.find((kpi) => kpi.key === "likes");
  const items: InsightsRecommendation["items"] = [];

  if (
    engagementKpi?.changePercent != null &&
    engagementKpi.changePercent !== 0 &&
    engagementKpi.value != null &&
    engagementKpi.previousValue != null
  ) {
    const rounded = Math.round(Math.abs(engagementKpi.changePercent) * 10) / 10;
    const direction = engagementKpi.changePercent > 0 ? "up" : "down";
    items.push({
      title: "Engagement trend",
      body: `Engagement is ${direction} ${rounded}% compared to the previous period (${engagementKpi.previousValue.toLocaleString()} → ${engagementKpi.value.toLocaleString()}).`,
    });
  } else if (engagementKpi?.value != null && engagementKpi.value > 0) {
    items.push({
      title: "Engagement",
      body: `You recorded ${engagementKpi.value.toLocaleString()} engagements in this period.`,
    });
  }

  if (
    reachKpi?.changePercent != null &&
    reachKpi.changePercent !== 0 &&
    reachKpi.value != null &&
    reachKpi.previousValue != null
  ) {
    const rounded = Math.round(Math.abs(reachKpi.changePercent) * 10) / 10;
    const direction = reachKpi.changePercent > 0 ? "up" : "down";
    items.push({
      title: "Reach trend",
      body: `Reach is ${direction} ${rounded}% compared to the previous period (${reachKpi.previousValue.toLocaleString()} → ${reachKpi.value.toLocaleString()}).`,
    });
  } else if (reachKpi?.value != null && reachKpi.value > 0) {
    items.push({
      title: "Reach",
      body: `Your content reached ${reachKpi.value.toLocaleString()} accounts in this period.`,
    });
  }

  if (input.contentBreakdown.length > 0) {
    const top = input.contentBreakdown[0];
    const metricLabel = top.engagement > 0 ? "engagement" : "posts";
    const metricValue =
      top.engagement > 0
        ? `${top.engagement.toLocaleString()} engagements`
        : `${top.count} post${top.count === 1 ? "" : "s"}`;
    items.push({
      title: "Top content format",
      body: `${top.label} led with ${metricValue} (${top.percent}% of total ${metricLabel}).`,
    });

    if (input.contentBreakdown.length >= 2) {
      const second = input.contentBreakdown[1];
      items.push({
        title: "Format comparison",
        body: `${top.label} outperformed ${second.label.toLowerCase()} (${top.percent}% vs ${second.percent}% of ${metricLabel}).`,
      });
    }
  }

  const facebook = input.platformComparison.find((entry) => entry.platform === "facebook");
  const instagram = input.platformComparison.find((entry) => entry.platform === "instagram");
  if (
    facebook?.reach != null &&
    instagram?.reach != null &&
    (facebook.reach > 0 || instagram.reach > 0)
  ) {
    const leader =
      facebook.reach >= instagram.reach
        ? { name: "Facebook", reach: facebook.reach, engagement: facebook.engagement }
        : { name: "Instagram", reach: instagram.reach, engagement: instagram.engagement };
    const other =
      leader.name === "Facebook"
        ? { name: "Instagram", reach: instagram.reach, engagement: instagram.engagement }
        : { name: "Facebook", reach: facebook.reach, engagement: facebook.engagement };

    items.push({
      title: "Platform reach",
      body: `${leader.name} reached ${leader.reach.toLocaleString()} accounts vs ${other.reach.toLocaleString()} on ${other.name}.`,
    });

    if (
      leader.engagement != null &&
      other.engagement != null &&
      (leader.engagement > 0 || other.engagement > 0)
    ) {
      items.push({
        title: "Platform engagement",
        body: `${leader.name} recorded ${leader.engagement.toLocaleString()} engagements vs ${other.engagement.toLocaleString()} on ${other.name}.`,
      });
    }
  }

  if (input.topPosts.length > 0) {
    const topPost = input.topPosts[0];
    items.push({
      title: "Best performing post",
      body: `"${topPost.title}" reached ${(topPost.reach ?? 0).toLocaleString()} accounts with ${(topPost.engagement ?? 0).toLocaleString()} engagements.`,
    });
  }

  if (likesKpi?.value != null && likesKpi.value > 0) {
    items.push({
      title: "Reactions",
      body: `${likesKpi.value.toLocaleString()} likes/reactions recorded in this period.`,
    });
  }

  if (items.length === 0) {
    return null;
  }

  const summaryParts: string[] = [];
  if (
    engagementKpi?.changePercent != null &&
    engagementKpi.changePercent > 0
  ) {
    summaryParts.push(
      `Your engagement is up ${Math.round(engagementKpi.changePercent * 10) / 10}% compared to the previous period.`,
    );
  } else if (engagementKpi?.value != null && engagementKpi.value > 0) {
    summaryParts.push(
      `You recorded ${engagementKpi.value.toLocaleString()} engagements in this period.`,
    );
  } else if (reachKpi?.value != null && reachKpi.value > 0) {
    summaryParts.push(
      `Your content reached ${reachKpi.value.toLocaleString()} accounts in this period.`,
    );
  } else {
    summaryParts.push(items[0].body);
  }

  return {
    summary: summaryParts.join(" "),
    items,
  };
}
