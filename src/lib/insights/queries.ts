import "server-only";

import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  formatDateRangeLabel,
  getPreviousPeriod,
  resolveInsightsDateRange,
} from "@/lib/insights/date-range";
import { formatRelativeTime } from "@/lib/insights/format";
import { buildContentBreakdownFromPosts, buildInsightsRecommendation } from "@/lib/insights/recommendations";
import { missingInsightsScopes } from "@/lib/insights/scopes";
import type {
  InsightsActivityEvent,
  InsightsConnectionHealth,
  InsightsDateRange,
  InsightsKpi,
  InsightsKpiKey,
  InsightsPageData,
  InsightsPlatform,
  InsightsPlatformTotals,
  InsightsTimeSeriesPoint,
  InsightsTopPost,
} from "@/lib/insights/types";
import {
  getMetaConnectionForOrganization,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { inspectMetaPageToken } from "@/lib/meta-publishing/connection-token-health";
import { createClient } from "@/lib/supabase/server";

type AccountInsightRow = {
  platform: "facebook" | "instagram";
  metric_date: string;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
};

type PostInsightRow = {
  id: string;
  external_post_id: string;
  platform: "facebook" | "instagram";
  placement: "feed" | "story" | null;
  post_title: string | null;
  published_at: string | null;
  reach: number;
  engagement: number;
};

type ActivityRow = {
  id: string;
  platform: "facebook" | "instagram";
  event_type: string;
  title: string;
  body: string | null;
  occurred_at: string;
};

function sumMetric(
  rows: AccountInsightRow[],
  key: keyof Pick<
    AccountInsightRow,
    "reach" | "engagement" | "likes" | "comments" | "shares"
  >,
  platform: InsightsPlatform = "all",
): number {
  return rows
    .filter((row) => platform === "all" || row.platform === platform)
    .reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function computeChangePercent(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }

  return ((current - previous) / previous) * 100;
}

function buildKpis(input: {
  current: AccountInsightRow[];
  previous: AccountInsightRow[];
  hasAccountData: boolean;
  unavailableReason: string | null;
}): InsightsKpi[] {
  const keys: Array<{ key: InsightsKpiKey; label: string }> = [
    { key: "reach", label: "Reach" },
    { key: "engagement", label: "Engagement" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "shares", label: "Shares" },
  ];

  return keys.map(({ key, label }) => {
    const value = input.hasAccountData ? sumMetric(input.current, key) : null;
    const previousValue = input.hasAccountData ? sumMetric(input.previous, key) : null;

    return {
      key,
      label,
      value,
      previousValue,
      changePercent:
        value != null && previousValue != null
          ? computeChangePercent(value, previousValue)
          : null,
      unavailableReason: input.hasAccountData ? null : input.unavailableReason,
    };
  });
}

function buildTimeSeries(
  rows: AccountInsightRow[],
  from: string,
  to: string,
  platform: InsightsPlatform = "all",
): InsightsTimeSeriesPoint[] {
  const filtered = rows.filter(
    (row) =>
      row.metric_date >= from &&
      row.metric_date <= to &&
      (platform === "all" || row.platform === platform),
  );

  const byDate = new Map<string, InsightsTimeSeriesPoint>();
  for (const row of filtered) {
    const current = byDate.get(row.metric_date) ?? {
      date: row.metric_date,
      reach: 0,
      engagement: 0,
      clicks: 0,
    };
    current.reach += Number(row.reach) || 0;
    current.engagement += Number(row.engagement) || 0;
    current.clicks += Number(row.clicks) || 0;
    byDate.set(row.metric_date, current);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildPlatformComparison(input: {
  current: AccountInsightRow[];
  previous: AccountInsightRow[];
  hasAccountData: boolean;
  unavailableReason: string | null;
}): InsightsPlatformTotals[] {
  const platforms: Array<"facebook" | "instagram"> = ["facebook", "instagram"];

  return platforms.map((platform) => {
    const reach = input.hasAccountData ? sumMetric(input.current, "reach", platform) : null;
    const engagement = input.hasAccountData
      ? sumMetric(input.current, "engagement", platform)
      : null;
    const previousReach = input.hasAccountData
      ? sumMetric(input.previous, "reach", platform)
      : null;
    const previousEngagement = input.hasAccountData
      ? sumMetric(input.previous, "engagement", platform)
      : null;

    return {
      platform,
      reach,
      engagement,
      previousReach,
      previousEngagement,
      reachChangePercent:
        reach != null && previousReach != null
          ? computeChangePercent(reach, previousReach)
          : null,
      unavailableReason: input.hasAccountData ? null : input.unavailableReason,
    };
  });
}

async function fetchAccountInsights(input: {
  organizationId: string;
  from: string;
  to: string;
}): Promise<AccountInsightRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_account_insights")
    .select("platform, metric_date, reach, engagement, likes, comments, shares, clicks")
    .eq("organization_id", input.organizationId)
    .gte("metric_date", input.from)
    .lte("metric_date", input.to);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to fetch account insights:", error.message);
    return [];
  }

  return (data ?? []) as AccountInsightRow[];
}

async function fetchPostInsights(input: {
  organizationId: string;
  from: string;
  to: string;
}): Promise<PostInsightRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_post_insights")
    .select(
      "id, external_post_id, platform, placement, post_title, published_at, reach, engagement",
    )
    .eq("organization_id", input.organizationId)
    .gte("published_at", `${input.from}T00:00:00.000Z`)
    .lte("published_at", `${input.to}T23:59:59.999Z`)
    .order("reach", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to fetch post insights:", error.message);
    return [];
  }

  return (data ?? []) as PostInsightRow[];
}

async function fetchActivityEvents(
  organizationId: string,
): Promise<InsightsActivityEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_activity_events")
    .select("id, platform, event_type, title, body, occurred_at")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(8);

  if (!error && data?.length) {
    return (data as ActivityRow[]).map((row) => ({
      id: row.id,
      platform: row.platform,
      eventType: row.event_type,
      title: row.title,
      body: row.body,
      occurredAt: row.occurred_at,
      relativeTime: formatRelativeTime(row.occurred_at),
    }));
  }

  const { data: inboxMessages, error: inboxError } = await supabase
    .from("inbox_messages")
    .select("id, channel_type, body, sent_at, thread_id")
    .eq("organization_id", organizationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(8);

  if (inboxError || !inboxMessages?.length) {
    return [];
  }

  const threadIds = [...new Set(inboxMessages.map((row) => row.thread_id as string))];
  const { data: threads } = await supabase
    .from("inbox_threads")
    .select("id, subject")
    .in("id", threadIds);

  const subjectByThread = new Map(
    (threads ?? []).map((thread) => [thread.id as string, thread.subject as string | null]),
  );

  return inboxMessages.map((row) => {
    const channelType = row.channel_type as string;
    const platform = channelType.startsWith("instagram") ? "instagram" : "facebook";
    const subject = subjectByThread.get(row.thread_id as string);
    const occurredAt = (row.sent_at as string | null) ?? new Date().toISOString();

    return {
      id: row.id as string,
      platform,
      eventType: channelType,
      title: channelType.includes("comment")
        ? `New comment${subject ? ` on "${subject}"` : ""}`
        : `New ${platform === "instagram" ? "Instagram" : "Facebook"} message`,
      body: (row.body as string | null) ?? null,
      occurredAt,
      relativeTime: formatRelativeTime(occurredAt),
    };
  });
}

async function fetchLatestSyncRun(organizationId: string): Promise<{
  status: "completed" | "failed" | "running" | null;
  completedAt: string | null;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analytics_sync_runs")
    .select("status, completed_at, error_message")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { status: null, completedAt: null, errorMessage: null };
  }

  return {
    status: data.status as "completed" | "failed" | "running",
    completedAt: (data.completed_at as string | null) ?? null,
    errorMessage: (data.error_message as string | null) ?? null,
  };
}

async function buildConnectionHealth(
  organizationId: string,
): Promise<InsightsConnectionHealth> {
  const connection = await getMetaConnectionForOrganization(organizationId);
  const metaConnected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);
  const latestSync = await fetchLatestSyncRun(organizationId);

  if (!metaConnected || !connection?.pageAccessToken) {
    return {
      metaConnected: false,
      pageName: null,
      hasInstagram: false,
      tokenValid: false,
      reconnectRequired: true,
      insightsScopesGranted: false,
      missingInsightsScopes: ["read_insights", "instagram_manage_insights"],
      lastSyncAt: latestSync.completedAt,
      lastSyncStatus: latestSync.status,
      lastSyncError: latestSync.errorMessage,
    };
  }

  const tokenHealth = await inspectMetaPageToken(connection.pageAccessToken);
  const missing = missingInsightsScopes(tokenHealth.grantedScopes);

  return {
    metaConnected: true,
    pageName: connection.pageName,
    hasInstagram,
    tokenValid: tokenHealth.tokenValid,
    reconnectRequired: tokenHealth.reconnectRequired,
    insightsScopesGranted: missing.length === 0,
    missingInsightsScopes: missing,
    lastSyncAt: latestSync.completedAt,
    lastSyncStatus: latestSync.status,
    lastSyncError: latestSync.errorMessage,
  };
}

function resolveUnavailableReason(connection: InsightsConnectionHealth): string {
  if (!connection.metaConnected) {
    return "Connect Meta to start tracking performance.";
  }

  if (connection.reconnectRequired) {
    return "Meta token expired — reconnect to refresh metrics.";
  }

  if (!connection.insightsScopesGranted) {
    return "Reconnect Meta to grant insights permissions.";
  }

  if (connection.lastSyncStatus === "running") {
    return "Insights sync in progress.";
  }

  return "No synced metrics yet — run a sync to pull data from Meta.";
}

export async function getInsightsPageData(input?: {
  from?: string | null;
  to?: string | null;
  range?: string | null;
}): Promise<InsightsPageData | null> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const dateRange: InsightsDateRange = resolveInsightsDateRange({
    from: input?.from,
    to: input?.to,
    range: input?.range,
  });
  const previousPeriod = getPreviousPeriod(dateRange.from, dateRange.to);
  const connection = await buildConnectionHealth(organization.id);

  const [currentAccount, previousAccount, postInsights, activity] =
    await Promise.all([
      fetchAccountInsights({
        organizationId: organization.id,
        from: dateRange.from,
        to: dateRange.to,
      }),
      fetchAccountInsights({
        organizationId: organization.id,
        from: previousPeriod.from,
        to: previousPeriod.to,
      }),
      fetchPostInsights({
        organizationId: organization.id,
        from: dateRange.from,
        to: dateRange.to,
      }),
      fetchActivityEvents(organization.id),
    ]);

  const hasAccountData = currentAccount.length > 0;
  const unavailableReason = hasAccountData ? null : resolveUnavailableReason(connection);

  const kpis = buildKpis({
    current: currentAccount,
    previous: previousAccount,
    hasAccountData,
    unavailableReason,
  });

  const timeSeries = {
    all: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "all"),
    facebook: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "facebook"),
    instagram: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "instagram"),
  };

  const topPosts: InsightsTopPost[] = postInsights.slice(0, 5).map((row) => ({
    id: row.id,
    title: row.post_title ?? "Published post",
    platform: row.platform,
    placement: row.placement,
    publishedAt: row.published_at,
    reach: row.reach,
    engagement: row.engagement,
    externalPostId: row.external_post_id,
  }));

  const platformComparison = buildPlatformComparison({
    current: currentAccount,
    previous: previousAccount,
    hasAccountData,
    unavailableReason,
  });

  const contentBreakdown = buildContentBreakdownFromPosts(postInsights);
  const hasAnyMetrics = hasAccountData || postInsights.length > 0;

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    dateRange,
    connection,
    kpis,
    timeSeries,
    activity,
    topPosts,
    platformComparison,
    contentBreakdown,
    audienceAvailable: false,
    recommendation: buildInsightsRecommendation({
      kpis,
      contentBreakdown,
      platformComparison,
      topPosts,
      hasAnyMetrics,
    }),
    hasAnyMetrics,
    syncInProgress: connection.lastSyncStatus === "running",
  };
}

export function buildInsightsExportRows(data: InsightsPageData): string[][] {
  const header = ["Section", "Label", "Value"];
  const rows: string[][] = [header];

  rows.push(["Date range", data.dateRange.label, `${data.dateRange.from} to ${data.dateRange.to}`]);

  for (const kpi of data.kpis) {
    rows.push([
      "KPI",
      kpi.label,
      kpi.value != null ? String(kpi.value) : kpi.unavailableReason ?? "Unavailable",
    ]);
  }

  for (const point of data.timeSeries.all) {
    rows.push([
      "Daily",
      point.date,
      `reach=${point.reach}; engagement=${point.engagement}; clicks=${point.clicks}`,
    ]);
  }

  for (const post of data.topPosts) {
    rows.push([
      "Top post",
      post.title,
      `reach=${post.reach ?? 0}; engagement=${post.engagement ?? 0}`,
    ]);
  }

  for (const item of data.contentBreakdown) {
    rows.push([
      "Content breakdown",
      item.label,
      `posts=${item.count}; engagement=${item.engagement}; share=${item.percent}%`,
    ]);
  }

  if (data.recommendation) {
    rows.push(["Recommendation", "Summary", data.recommendation.summary]);
    for (const item of data.recommendation.items) {
      rows.push(["Recommendation", item.title, item.body]);
    }
  }

  return rows;
}

export { formatDateRangeLabel };
