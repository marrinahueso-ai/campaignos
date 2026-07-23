export type InsightsPlatform = "all" | "facebook" | "instagram";

export type InsightsDateRange = {
  from: string;
  to: string;
  label: string;
};

export type InsightsKpiKey =
  | "views"
  | "reach"
  | "engagement"
  | "likes"
  | "comments";

export type InsightsKpi = {
  key: InsightsKpiKey;
  label: string;
  value: number | null;
  previousValue: number | null;
  changePercent: number | null;
  unavailableReason: string | null;
  /** Daily values across the selected range for sparkline rendering. */
  sparkline: number[];
};

export type InsightsTimeSeriesPoint = {
  date: string;
  views: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  clicks: number;
};

export type InsightsTimeSeriesByPlatform = {
  all: InsightsTimeSeriesPoint[];
  facebook: InsightsTimeSeriesPoint[];
  instagram: InsightsTimeSeriesPoint[];
};

export type InsightsActivityEvent = {
  id: string;
  platform: "facebook" | "instagram";
  eventType: string;
  title: string;
  body: string | null;
  occurredAt: string;
  relativeTime: string;
};

export type InsightsTopPost = {
  id: string;
  title: string;
  captionSnippet: string | null;
  thumbnailUrl: string | null;
  platform: "facebook" | "instagram";
  placement: "feed" | "story" | null;
  publishedAt: string | null;
  views: number | null;
  reach: number | null;
  engagement: number | null;
  likes: number | null;
  comments: number | null;
  /** Synced from Meta post insights (`post_shares` / IG shares); 0 when none. */
  shares: number | null;
  externalPostId: string;
};

export type InsightsPlatformTotals = {
  platform: "facebook" | "instagram";
  views: number | null;
  reach: number | null;
  engagement: number | null;
  previousReach: number | null;
  previousEngagement: number | null;
  reachChangePercent: number | null;
  unavailableReason: string | null;
};

export type InsightsContentBreakdownItem = {
  label: string;
  count: number;
  engagement: number;
  percent: number;
};

export type InsightsRecommendationItem = {
  title: string;
  body: string;
};

export type InsightsRecommendation = {
  summary: string;
  items: InsightsRecommendationItem[];
};

export type InsightsConnectionHealth = {
  metaConnected: boolean;
  pageName: string | null;
  hasInstagram: boolean;
  tokenValid: boolean;
  reconnectRequired: boolean;
  insightsScopesGranted: boolean;
  missingInsightsScopes: string[];
  lastSyncAt: string | null;
  lastSyncStatus: "completed" | "failed" | "running" | null;
  lastSyncError: string | null;
  lastSyncWarnings: string[];
};

export type InsightsPageData = {
  organizationId: string;
  organizationName: string;
  dateRange: InsightsDateRange;
  connection: InsightsConnectionHealth;
  kpis: InsightsKpi[];
  timeSeries: InsightsTimeSeriesByPlatform;
  activity: InsightsActivityEvent[];
  topPosts: InsightsTopPost[];
  platformComparison: InsightsPlatformTotals[];
  contentBreakdown: InsightsContentBreakdownItem[];
  audienceAvailable: boolean;
  recommendation: InsightsRecommendation | null;
  hasAnyMetrics: boolean;
  syncInProgress: boolean;
  /**
   * Honest capability notes for metrics Meta Business Suite shows that we
   * cannot currently break out (organic vs ads, page visits, conversations).
   */
  unavailableMetricNotes: string[];
};
