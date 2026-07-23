import "server-only";

import {
  FACEBOOK_PAGE_DAILY_METRICS,
  FACEBOOK_POST_METRICS,
  FACEBOOK_POST_VIEW_METRICS,
  INSTAGRAM_ACCOUNT_TIME_SERIES_METRICS,
  INSTAGRAM_ACCOUNT_TOTAL_VALUE_METRICS,
  INSTAGRAM_FEED_MEDIA_METRICS,
  INSTAGRAM_STORY_MEDIA_METRICS,
  looksLikeFacebookPhotoId,
} from "@/lib/meta/insights-metrics";
import {
  parseDailyInsights,
  parsePostInsights,
  type InsightValueRow,
  type NormalizedDailyInsight,
  type NormalizedPostInsight,
} from "@/lib/meta/insights-normalize";

export { engagementFallbackInsight } from "@/lib/meta/insights-normalize";

const DEFAULT_GRAPH_VERSION = "v21.0";

type GraphResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; errorCode?: number };

type GraphErrorPayload = {
  message?: string;
  code?: number;
  type?: string;
};

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
}

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${graphVersion()}${path}`;
}

function formatGraphError(payload: GraphErrorPayload, status: number): string {
  const parts = [payload.message ?? `Meta API error (${status})`];
  if (payload.code != null) {
    parts.push(`code=${payload.code}`);
  }
  return parts.join(" · ");
}

async function graphGet(path: string, params: Record<string, string>): Promise<GraphResult> {
  const url = new URL(graphUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    data?: unknown;
    post_id?: string;
    error?: GraphErrorPayload;
  };

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
    };
  }

  return { ok: true, data: payload as Record<string, unknown> };
}

export type { NormalizedDailyInsight, NormalizedPostInsight };

export async function fetchFacebookPageDailyInsights(input: {
  pageId: string;
  accessToken: string;
  since: string;
  until: string;
}): Promise<{ rows: NormalizedDailyInsight[]; error: string | null }> {
  const result = await graphGet(`/${input.pageId}/insights`, {
    metric: FACEBOOK_PAGE_DAILY_METRICS.join(","),
    period: "day",
    since: input.since,
    until: input.until,
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { rows: [], error: result.error };
  }

  const data = (result.data.data ?? []) as InsightValueRow[];
  return { rows: parseDailyInsights(data), error: null };
}

async function fetchInstagramAccountMetricRows(input: {
  instagramAccountId: string;
  accessToken: string;
  since: string;
  until: string;
  metrics: readonly string[];
  metricType?: "total_value";
}): Promise<{ rows: InsightValueRow[]; error: string | null }> {
  const params: Record<string, string> = {
    metric: input.metrics.join(","),
    period: "day",
    since: input.since,
    until: input.until,
    access_token: input.accessToken,
  };

  if (input.metricType) {
    params.metric_type = input.metricType;
  }

  const result = await graphGet(`/${input.instagramAccountId}/insights`, params);
  if (!result.ok) {
    return { rows: [], error: result.error };
  }

  return { rows: (result.data.data ?? []) as InsightValueRow[], error: null };
}

export async function fetchInstagramAccountDailyInsights(input: {
  instagramAccountId: string;
  accessToken: string;
  since: string;
  until: string;
}): Promise<{ rows: NormalizedDailyInsight[]; error: string | null }> {
  const [reachResult, engagedResult] = await Promise.all([
    fetchInstagramAccountMetricRows({
      instagramAccountId: input.instagramAccountId,
      accessToken: input.accessToken,
      since: input.since,
      until: input.until,
      metrics: INSTAGRAM_ACCOUNT_TIME_SERIES_METRICS,
    }),
    fetchInstagramAccountMetricRows({
      instagramAccountId: input.instagramAccountId,
      accessToken: input.accessToken,
      since: input.since,
      until: input.until,
      metrics: INSTAGRAM_ACCOUNT_TOTAL_VALUE_METRICS,
      metricType: "total_value",
    }),
  ]);

  const errors = [reachResult.error, engagedResult.error].filter(Boolean);
  if (errors.length === 2) {
    return { rows: [], error: errors.join("; ") };
  }

  const rows = [...reachResult.rows, ...engagedResult.rows];
  return {
    rows: parseDailyInsights(rows),
    error: errors[0] ?? null,
  };
}

async function resolveFacebookPostIdForInsights(input: {
  objectId: string;
  accessToken: string;
}): Promise<string | null> {
  if (!looksLikeFacebookPhotoId(input.objectId)) {
    return null;
  }

  const result = await graphGet(`/${input.objectId}`, {
    fields: "post_id",
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return null;
  }

  const postId = String(result.data.post_id ?? "").trim();
  return postId || null;
}

async function fetchFacebookPostInsightsForId(input: {
  postId: string;
  accessToken: string;
}): Promise<{
  insight: NormalizedPostInsight | null;
  error: string | null;
  errorCode?: number;
}> {
  const primary = await graphGet(`/${input.postId}/insights`, {
    metric: FACEBOOK_POST_METRICS.join(","),
    access_token: input.accessToken,
  });

  if (primary.ok) {
    const data = (primary.data.data ?? []) as InsightValueRow[];
    return { insight: parsePostInsights(data), error: null };
  }

  // One invalid metric name fails the whole batch — retry views-only.
  if (
    primary.errorCode === 100 &&
    /valid insights metric/i.test(primary.error)
  ) {
    const fallback = await graphGet(`/${input.postId}/insights`, {
      metric: FACEBOOK_POST_VIEW_METRICS.join(","),
      access_token: input.accessToken,
    });

    if (fallback.ok) {
      const data = (fallback.data.data ?? []) as InsightValueRow[];
      return { insight: parsePostInsights(data), error: null };
    }

    return {
      insight: null,
      error: fallback.error,
      errorCode: fallback.errorCode,
    };
  }

  return {
    insight: null,
    error: primary.error,
    errorCode: primary.errorCode,
  };
}

export async function fetchFacebookPostInsights(input: {
  postId: string;
  accessToken: string;
  placement?: "feed" | "story";
}): Promise<{
  insight: NormalizedPostInsight | null;
  error: string | null;
  errorCode?: number;
  skipped?: boolean;
  skipReason?: string;
}> {
  if (input.placement === "story") {
    return {
      insight: null,
      error: null,
      skipped: true,
      skipReason: "Facebook stories do not expose post-level insights via Graph API.",
    };
  }

  const direct = await fetchFacebookPostInsightsForId({
    postId: input.postId,
    accessToken: input.accessToken,
  });
  if (direct.insight || !direct.error) {
    return direct;
  }

  const resolvedPostId = await resolveFacebookPostIdForInsights({
    objectId: input.postId,
    accessToken: input.accessToken,
  });

  if (!resolvedPostId || resolvedPostId === input.postId) {
    return direct;
  }

  return fetchFacebookPostInsightsForId({
    postId: resolvedPostId,
    accessToken: input.accessToken,
  });
}

export async function fetchInstagramMediaInsights(input: {
  mediaId: string;
  accessToken: string;
  placement: "feed" | "story";
}): Promise<{
  insight: NormalizedPostInsight | null;
  error: string | null;
  errorCode?: number;
}> {
  const metrics =
    input.placement === "story"
      ? INSTAGRAM_STORY_MEDIA_METRICS.join(",")
      : INSTAGRAM_FEED_MEDIA_METRICS.join(",");

  const result = await graphGet(`/${input.mediaId}/insights`, {
    metric: metrics,
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { insight: null, error: result.error, errorCode: result.errorCode };
  }

  const data = (result.data.data ?? []) as InsightValueRow[];
  const parsed = parsePostInsights(data);

  if (input.placement === "story") {
    parsed.engagement = parsed.shares + parsed.comments;
  } else {
    parsed.engagement = parsed.likes + parsed.comments + parsed.shares;
  }

  if (parsed.views <= 0 && parsed.reach > 0) {
    parsed.views = parsed.reach;
  }

  return { insight: parsed, error: null };
}

/** Recent Page/IG posts discovered from Graph (not only CampignOS publication slots). */
export type DiscoveredSocialPost = {
  externalPostId: string;
  platform: "facebook" | "instagram";
  placement: "feed" | "story";
  message: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  likes: number;
  comments: number;
  shares: number;
};

function readGraphString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function readSummaryTotal(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }
  const summary = (value as { summary?: { total_count?: unknown } }).summary;
  return Number(summary?.total_count) || 0;
}

function readSharesCount(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }
  return Number((value as { count?: unknown }).count) || 0;
}

function withinDateRange(
  publishedAt: string | null,
  since: string,
  until: string,
): boolean {
  if (!publishedAt) {
    return true;
  }
  const day = publishedAt.slice(0, 10);
  return day >= since && day <= until;
}

async function graphGetPagedItems(input: {
  path: string;
  params: Record<string, string>;
  maxPages?: number;
}): Promise<{ items: Record<string, unknown>[]; error: string | null }> {
  const items: Record<string, unknown>[] = [];
  let nextPath: string | null = input.path;
  let nextParams: Record<string, string> | null = input.params;
  const maxPages = input.maxPages ?? 2;

  for (let page = 0; page < maxPages && nextPath; page += 1) {
    const result = nextParams
      ? await graphGet(nextPath, nextParams)
      : await (async () => {
          const response = await fetch(nextPath!);
          const payload = (await response.json()) as {
            data?: unknown;
            error?: GraphErrorPayload;
            paging?: { next?: string };
          };
          if (!response.ok || payload.error) {
            return {
              ok: false as const,
              error: formatGraphError(payload.error ?? {}, response.status),
              errorCode: payload.error?.code,
            };
          }
          return { ok: true as const, data: payload as Record<string, unknown> };
        })();

    if (!result.ok) {
      return { items, error: result.error };
    }

    const pageItems = Array.isArray(result.data.data)
      ? (result.data.data as Record<string, unknown>[])
      : [];
    items.push(...pageItems);

    const paging = result.data.paging as { next?: string } | undefined;
    const nextUrl = typeof paging?.next === "string" ? paging.next : null;
    if (!nextUrl) {
      break;
    }
    nextPath = nextUrl;
    nextParams = null;
  }

  return { items, error: null };
}

/**
 * Lists recent published Facebook Page feed posts (includes posts not created via Hey Ralli).
 */
export async function fetchFacebookPageRecentPosts(input: {
  pageId: string;
  accessToken: string;
  since: string;
  until: string;
  limit?: number;
}): Promise<{ posts: DiscoveredSocialPost[]; error: string | null }> {
  const result = await graphGetPagedItems({
    path: `/${input.pageId}/posts`,
    params: {
      fields:
        "id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)",
      limit: String(input.limit ?? 25),
      access_token: input.accessToken,
    },
    maxPages: 2,
  });

  if (result.error && result.items.length === 0) {
    return { posts: [], error: result.error };
  }

  const posts: DiscoveredSocialPost[] = [];
  for (const item of result.items) {
    const externalPostId = readGraphString(item.id);
    if (!externalPostId) {
      continue;
    }
    const publishedAt = readGraphString(item.created_time);
    if (!withinDateRange(publishedAt, input.since, input.until)) {
      continue;
    }

    posts.push({
      externalPostId,
      platform: "facebook",
      placement: "feed",
      message: readGraphString(item.message),
      publishedAt,
      thumbnailUrl: readGraphString(item.full_picture),
      likes: readSummaryTotal(item.reactions),
      comments: readSummaryTotal(item.comments),
      shares: readSharesCount(item.shares),
    });
  }

  return { posts, error: result.error };
}

/**
 * Lists recent Instagram feed media for the connected business account.
 */
export async function fetchInstagramRecentMedia(input: {
  instagramAccountId: string;
  accessToken: string;
  since: string;
  until: string;
  limit?: number;
}): Promise<{ posts: DiscoveredSocialPost[]; error: string | null }> {
  const result = await graphGetPagedItems({
    path: `/${input.instagramAccountId}/media`,
    params: {
      fields:
        "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink",
      limit: String(input.limit ?? 25),
      access_token: input.accessToken,
    },
    maxPages: 2,
  });

  if (result.error && result.items.length === 0) {
    return { posts: [], error: result.error };
  }

  const posts: DiscoveredSocialPost[] = [];
  for (const item of result.items) {
    const externalPostId = readGraphString(item.id);
    if (!externalPostId) {
      continue;
    }
    const publishedAt = readGraphString(item.timestamp);
    if (!withinDateRange(publishedAt, input.since, input.until)) {
      continue;
    }

    posts.push({
      externalPostId,
      platform: "instagram",
      placement: "feed",
      message: readGraphString(item.caption),
      publishedAt,
      thumbnailUrl:
        readGraphString(item.thumbnail_url) ?? readGraphString(item.media_url),
      likes: Number(item.like_count) || 0,
      comments: Number(item.comments_count) || 0,
      shares: 0,
    });
  }

  return { posts, error: result.error };
}

