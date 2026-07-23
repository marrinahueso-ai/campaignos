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
  extractPostDisplayFields,
  extractViewsFromRawMetrics,
} from "@/lib/meta/insights-normalize";
import {
  getMetaConnectionForOrganization,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { inspectMetaPageToken } from "@/lib/meta-publishing/connection-token-health";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
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
  raw_metrics: Record<string, unknown> | null;
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
  likes: number;
  comments: number;
  shares: number;
  raw_metrics: Record<string, unknown> | null;
  meta_publication_slot_id: string | null;
};

type ActivityRow = {
  id: string;
  platform: "facebook" | "instagram";
  event_type: string;
  title: string;
  body: string | null;
  occurred_at: string;
};

type MetricKey = "views" | "reach" | "engagement" | "likes" | "comments" | "shares";

function rowViews(row: AccountInsightRow | PostInsightRow): number {
  return extractViewsFromRawMetrics(row.raw_metrics, Number(row.reach) || 0);
}

function rowEngagement(row: PostInsightRow): number {
  const stored = Number(row.engagement) || 0;
  if (stored > 0) {
    return stored;
  }
  return (Number(row.likes) || 0) + (Number(row.comments) || 0) + (Number(row.shares) || 0);
}

function metricFromAccountRow(row: AccountInsightRow, key: MetricKey): number {
  switch (key) {
    case "views":
      return rowViews(row);
    case "reach":
      return Number(row.reach) || 0;
    case "engagement":
      return Number(row.engagement) || 0;
    case "likes":
      return Number(row.likes) || 0;
    case "comments":
      return Number(row.comments) || 0;
    case "shares":
      return Number(row.shares) || 0;
    default:
      return 0;
  }
}

function sumAccountMetric(
  rows: AccountInsightRow[],
  key: MetricKey,
  platform: InsightsPlatform = "all",
): number {
  return rows
    .filter((row) => platform === "all" || row.platform === platform)
    .reduce((sum, row) => sum + metricFromAccountRow(row, key), 0);
}

function sumPostMetric(
  rows: PostInsightRow[],
  key: "likes" | "comments" | "shares" | "engagement" | "views" | "reach",
  platform: InsightsPlatform = "all",
): number {
  return rows
    .filter((row) => platform === "all" || row.platform === platform)
    .reduce((sum, row) => {
      if (key === "views") return sum + rowViews(row);
      if (key === "reach") return sum + (Number(row.reach) || 0);
      if (key === "engagement") return sum + rowEngagement(row);
      return sum + (Number(row[key]) || 0);
    }, 0);
}

function computeChangePercent(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }

  return ((current - previous) / previous) * 100;
}

function fillDateKeys(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00.000Z`);
  const end = new Date(`${to}T12:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function buildSparkline(
  rows: AccountInsightRow[],
  key: MetricKey,
  from: string,
  to: string,
  platform: InsightsPlatform = "all",
): number[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (platform !== "all" && row.platform !== platform) {
      continue;
    }
    byDate.set(
      row.metric_date,
      (byDate.get(row.metric_date) ?? 0) + metricFromAccountRow(row, key),
    );
  }

  return fillDateKeys(from, to).map((date) => byDate.get(date) ?? 0);
}

function resolveKpiValue(input: {
  key: MetricKey;
  accountRows: AccountInsightRow[];
  postRows: PostInsightRow[];
  platform?: InsightsPlatform;
}): number {
  const platform = input.platform ?? "all";
  const accountTotal = sumAccountMetric(input.accountRows, input.key, platform);

  // Page-level Graph metrics omit comments/shares; fall back to post aggregates.
  if (
    (input.key === "comments" || input.key === "shares" || input.key === "likes") &&
    accountTotal <= 0 &&
    input.postRows.length > 0
  ) {
    return sumPostMetric(input.postRows, input.key, platform);
  }

  return accountTotal;
}

function buildKpis(input: {
  current: AccountInsightRow[];
  previous: AccountInsightRow[];
  currentPosts: PostInsightRow[];
  previousPosts: PostInsightRow[];
  from: string;
  to: string;
  hasAccountData: boolean;
  hasPostData: boolean;
  unavailableReason: string | null;
}): InsightsKpi[] {
  const keys: Array<{ key: InsightsKpiKey; label: string }> = [
    { key: "views", label: "Views" },
    { key: "reach", label: "Reach" },
    { key: "engagement", label: "Interactions" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
  ];

  const hasData = input.hasAccountData || input.hasPostData;

  return keys.map(({ key, label }) => {
    const value = hasData
      ? resolveKpiValue({
          key,
          accountRows: input.current,
          postRows: input.currentPosts,
        })
      : null;
    const previousValue = hasData
      ? resolveKpiValue({
          key,
          accountRows: input.previous,
          postRows: input.previousPosts,
        })
      : null;

    return {
      key,
      label,
      value,
      previousValue,
      changePercent:
        value != null && previousValue != null
          ? computeChangePercent(value, previousValue)
          : null,
      unavailableReason: hasData ? null : input.unavailableReason,
      sparkline: hasData
        ? buildSparkline(input.current, key, input.from, input.to, "all")
        : [],
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
      views: 0,
      reach: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      clicks: 0,
    };
    current.views += rowViews(row);
    current.reach += Number(row.reach) || 0;
    current.engagement += Number(row.engagement) || 0;
    current.likes += Number(row.likes) || 0;
    current.comments += Number(row.comments) || 0;
    current.clicks += Number(row.clicks) || 0;
    byDate.set(row.metric_date, current);
  }

  // Dense series so the chart x-axis matches the selected date range.
  return fillDateKeys(from, to).map((date) => {
    return (
      byDate.get(date) ?? {
        date,
        views: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        clicks: 0,
      }
    );
  });
}

function buildPlatformComparison(input: {
  current: AccountInsightRow[];
  previous: AccountInsightRow[];
  hasAccountData: boolean;
  unavailableReason: string | null;
  hasInstagram: boolean;
}): InsightsPlatformTotals[] {
  const hasInstagramRows = input.current.some((row) => row.platform === "instagram");
  const platforms: Array<"facebook" | "instagram"> =
    input.hasInstagram || hasInstagramRows
      ? ["facebook", "instagram"]
      : ["facebook"];

  return platforms.map((platform) => {
    const views = input.hasAccountData
      ? sumAccountMetric(input.current, "views", platform)
      : null;
    const reach = input.hasAccountData
      ? sumAccountMetric(input.current, "reach", platform)
      : null;
    const engagement = input.hasAccountData
      ? sumAccountMetric(input.current, "engagement", platform)
      : null;
    const previousReach = input.hasAccountData
      ? sumAccountMetric(input.previous, "reach", platform)
      : null;
    const previousEngagement = input.hasAccountData
      ? sumAccountMetric(input.previous, "engagement", platform)
      : null;

    return {
      platform,
      views,
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
    .select(
      "platform, metric_date, reach, engagement, likes, comments, shares, clicks, raw_metrics",
    )
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
      "id, external_post_id, platform, placement, post_title, published_at, reach, engagement, likes, comments, shares, raw_metrics, meta_publication_slot_id",
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

function captionSnippet(text: string | null | undefined, max = 72): string | null {
  if (!text?.trim()) {
    return null;
  }
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

async function enrichTopPosts(posts: PostInsightRow[]): Promise<InsightsTopPost[]> {
  if (posts.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const slotIds = posts
    .map((post) => post.meta_publication_slot_id)
    .filter((id): id is string => Boolean(id));

  const slotById = new Map<
    string,
    {
      event_id: string;
      event_asset_id: string | null;
      milestone_title: string;
      placement: "feed" | "story";
    }
  >();

  if (slotIds.length > 0) {
    const { data: slots } = await supabase
      .from("meta_publication_slots")
      .select("id, event_id, event_asset_id, milestone_title, placement")
      .in("id", slotIds);

    for (const slot of slots ?? []) {
      slotById.set(slot.id as string, {
        event_id: slot.event_id as string,
        event_asset_id: (slot.event_asset_id as string | null) ?? null,
        milestone_title: (slot.milestone_title as string) ?? "",
        placement: slot.placement as "feed" | "story",
      });
    }
  }

  const assetIds = [...slotById.values()]
    .map((slot) => slot.event_asset_id)
    .filter((id): id is string => Boolean(id));
  const assetUrlById = new Map<string, string | null>();

  if (assetIds.length > 0) {
    const { data: assets } = await supabase
      .from("event_assets")
      .select("id, storage_path")
      .in("id", assetIds);

    for (const asset of assets ?? []) {
      assetUrlById.set(
        asset.id as string,
        resolveAssetImageUrl((asset.storage_path as string | null) ?? null),
      );
    }
  }

  const eventIds = [...new Set([...slotById.values()].map((slot) => slot.event_id))];
  const approvalByEvent = new Map<
    string,
    Array<{
      milestone_name: string;
      caption_text: string | null;
      story_caption: string | null;
      feed_artwork_url: string | null;
      story_artwork_url: string | null;
    }>
  >();

  if (eventIds.length > 0) {
    const { data: approvals } = await supabase
      .from("approval_scheduling_items")
      .select(
        "event_id, milestone_name, caption_text, story_caption, feed_artwork_url, story_artwork_url",
      )
      .in("event_id", eventIds);

    for (const row of approvals ?? []) {
      const eventId = row.event_id as string;
      const list = approvalByEvent.get(eventId) ?? [];
      list.push({
        milestone_name: String(row.milestone_name ?? ""),
        caption_text: (row.caption_text as string | null) ?? null,
        story_caption: (row.story_caption as string | null) ?? null,
        feed_artwork_url: (row.feed_artwork_url as string | null) ?? null,
        story_artwork_url: (row.story_artwork_url as string | null) ?? null,
      });
      approvalByEvent.set(eventId, list);
    }
  }

  const enriched = posts.map((row) => {
    const views = rowViews(row);
    const engagement = rowEngagement(row);
    const slot = row.meta_publication_slot_id
      ? slotById.get(row.meta_publication_slot_id)
      : null;
    const syncedDisplay = extractPostDisplayFields(row.raw_metrics);
    let thumbnailUrl: string | null = syncedDisplay.thumbnailUrl;
    let caption: string | null = syncedDisplay.caption;

    if (slot) {
      if (slot.event_asset_id) {
        thumbnailUrl = assetUrlById.get(slot.event_asset_id) ?? thumbnailUrl;
      }

      const approvals = approvalByEvent.get(slot.event_id) ?? [];
      const match =
        approvals.find(
          (entry) =>
            entry.milestone_name.trim().toLowerCase() ===
            slot.milestone_title.trim().toLowerCase(),
        ) ?? approvals[0];

      if (match) {
        caption =
          caption ??
          (slot.placement === "story"
            ? match.story_caption ?? match.caption_text
            : match.caption_text ?? match.story_caption);
        if (!thumbnailUrl) {
          thumbnailUrl =
            slot.placement === "story"
              ? match.story_artwork_url ?? match.feed_artwork_url
              : match.feed_artwork_url ?? match.story_artwork_url;
        }
      }
    }

    return {
      id: row.id,
      title: row.post_title ?? "Published post",
      captionSnippet: captionSnippet(caption) ?? captionSnippet(row.post_title),
      thumbnailUrl,
      platform: row.platform,
      placement: row.placement,
      publishedAt: row.published_at,
      views,
      reach: Number(row.reach) || 0,
      engagement,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      shares: Number(row.shares) || 0,
      externalPostId: row.external_post_id,
      _sortViews: views,
      _sortEngagement: engagement,
    };
  });

  return enriched
    .sort((a, b) => {
      if (b._sortViews !== a._sortViews) {
        return b._sortViews - a._sortViews;
      }
      return b._sortEngagement - a._sortEngagement;
    })
    .slice(0, 8)
    .map(({ _sortViews: _v, _sortEngagement: _e, ...post }) => post);
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
  warnings: string[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analytics_sync_runs")
    .select("status, completed_at, error_message, metadata")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { status: null, completedAt: null, errorMessage: null, warnings: [] };
  }

  const metadata = (data.metadata as { warnings?: unknown } | null) ?? null;
  const warnings = Array.isArray(metadata?.warnings)
    ? metadata.warnings.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    status: data.status as "completed" | "failed" | "running",
    completedAt: (data.completed_at as string | null) ?? null,
    errorMessage: (data.error_message as string | null) ?? null,
    warnings,
  };
}

export async function getInsightsConnectionHealth(
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
      lastSyncWarnings: latestSync.warnings,
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
    lastSyncWarnings: latestSync.warnings,
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
  const connection = await getInsightsConnectionHealth(organization.id);

  const [currentAccount, previousAccount, postInsights, previousPosts, activity] =
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
      fetchPostInsights({
        organizationId: organization.id,
        from: previousPeriod.from,
        to: previousPeriod.to,
      }),
      fetchActivityEvents(organization.id),
    ]);

  const hasAccountData = currentAccount.length > 0;
  const hasPostData = postInsights.length > 0;
  const unavailableReason =
    hasAccountData || hasPostData ? null : resolveUnavailableReason(connection);

  const kpis = buildKpis({
    current: currentAccount,
    previous: previousAccount,
    currentPosts: postInsights,
    previousPosts,
    from: dateRange.from,
    to: dateRange.to,
    hasAccountData,
    hasPostData,
    unavailableReason,
  });

  const timeSeries = {
    all: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "all"),
    facebook: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "facebook"),
    instagram: buildTimeSeries(currentAccount, dateRange.from, dateRange.to, "instagram"),
  };

  const topPosts = await enrichTopPosts(postInsights);

  const platformComparison = buildPlatformComparison({
    current: currentAccount,
    previous: previousAccount,
    hasAccountData,
    unavailableReason,
    hasInstagram: connection.hasInstagram,
  });

  const contentBreakdown = buildContentBreakdownFromPosts(
    postInsights.map((row) => ({
      platform: row.platform,
      placement: row.placement,
      engagement: rowEngagement(row),
    })),
  );
  const hasAnyMetrics = hasAccountData || hasPostData;

  const unavailableMetricNotes = [
    "Organic vs ads view breakdown is not available with current Page insights metrics.",
    "Page visits, follows, and messaging conversations require additional Meta product metrics not synced yet.",
  ];

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
    // Demographics deferred — keep false so UI never shows a dead Audience card.
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
    unavailableMetricNotes,
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
      `views=${point.views}; reach=${point.reach}; engagement=${point.engagement}; likes=${point.likes}; clicks=${point.clicks}`,
    ]);
  }

  for (const post of data.topPosts) {
    rows.push([
      "Top post",
      post.title,
      `views=${post.views ?? 0}; comments=${post.comments ?? 0}; likes=${post.likes ?? 0}; engagement=${post.engagement ?? 0}`,
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
