import "server-only";

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

export type NormalizedDailyInsight = {
  date: string;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  rawMetrics: Record<string, number>;
};

export type NormalizedPostInsight = {
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  rawMetrics: Record<string, number>;
};

type InsightValueRow = {
  name?: string;
  period?: string;
  values?: Array<{ value?: number | Record<string, number>; end_time?: string }>;
};

function readMetricValue(value: number | Record<string, number> | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value).reduce((sum, entry) => sum + (Number(entry) || 0), 0);
  }

  return 0;
}

function parseDailyInsights(rows: InsightValueRow[]): NormalizedDailyInsight[] {
  const byDate = new Map<string, NormalizedDailyInsight>();

  for (const row of rows) {
    const metricName = row.name ?? "";
    for (const entry of row.values ?? []) {
      const endTime = entry.end_time;
      if (!endTime) {
        continue;
      }

      const date = endTime.slice(0, 10);
      const current =
        byDate.get(date) ??
        ({
          date,
          reach: 0,
          engagement: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          rawMetrics: {},
        } satisfies NormalizedDailyInsight);

      const amount = readMetricValue(entry.value);
      current.rawMetrics[metricName] = amount;

      if (
        metricName.includes("impressions_unique") ||
        metricName === "reach" ||
        metricName === "impressions"
      ) {
        current.reach += amount;
      } else if (metricName.includes("engagement") || metricName.includes("engaged")) {
        current.engagement += amount;
      } else if (metricName.includes("reactions_like") || metricName === "likes") {
        current.likes += amount;
      } else if (metricName.includes("comment")) {
        current.comments += amount;
      } else if (metricName.includes("share")) {
        current.shares += amount;
      } else if (metricName.includes("click")) {
        current.clicks += amount;
      }

      byDate.set(date, current);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function parsePostInsights(rows: InsightValueRow[]): NormalizedPostInsight {
  const rawMetrics: Record<string, number> = {};
  let reach = 0;
  let engagement = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let clicks = 0;

  for (const row of rows) {
    const metricName = row.name ?? "";
    const amount = readMetricValue(row.values?.[0]?.value);
    rawMetrics[metricName] = amount;

    if (
      metricName.includes("impressions_unique") ||
      metricName === "reach" ||
      metricName === "impressions"
    ) {
      reach += amount;
    } else if (metricName.includes("engagement") || metricName.includes("engaged")) {
      engagement += amount;
    } else if (metricName.includes("reactions_like") || metricName === "likes") {
      likes += amount;
    } else if (metricName.includes("comment")) {
      comments += amount;
    } else if (metricName.includes("share")) {
      shares += amount;
    } else if (metricName.includes("click")) {
      clicks += amount;
    }
  }

  return { reach, engagement, likes, comments, shares, clicks, rawMetrics };
}

export async function fetchFacebookPageDailyInsights(input: {
  pageId: string;
  accessToken: string;
  since: string;
  until: string;
}): Promise<{ rows: NormalizedDailyInsight[]; error: string | null }> {
  const result = await graphGet(`/${input.pageId}/insights`, {
    metric:
      "page_impressions_unique,page_post_engagements,page_actions_post_reactions_like_total,page_posts_impressions",
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

export async function fetchInstagramAccountDailyInsights(input: {
  instagramAccountId: string;
  accessToken: string;
  since: string;
  until: string;
}): Promise<{ rows: NormalizedDailyInsight[]; error: string | null }> {
  const result = await graphGet(`/${input.instagramAccountId}/insights`, {
    metric: "reach,accounts_engaged",
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

export async function fetchFacebookPostInsights(input: {
  postId: string;
  accessToken: string;
}): Promise<{ insight: NormalizedPostInsight | null; error: string | null }> {
  const result = await graphGet(`/${input.postId}/insights`, {
    metric:
      "post_impressions_unique,post_engaged_users,post_reactions_like_total,post_comments,post_shares,post_clicks",
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { insight: null, error: result.error };
  }

  const data = (result.data.data ?? []) as InsightValueRow[];
  return { insight: parsePostInsights(data), error: null };
}

export async function fetchInstagramMediaInsights(input: {
  mediaId: string;
  accessToken: string;
  placement: "feed" | "story";
}): Promise<{ insight: NormalizedPostInsight | null; error: string | null }> {
  const metrics =
    input.placement === "story"
      ? "reach,replies,shares"
      : "reach,likes,comments,shares,saved,total_interactions";

  const result = await graphGet(`/${input.mediaId}/insights`, {
    metric: metrics,
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { insight: null, error: result.error };
  }

  const data = (result.data.data ?? []) as InsightValueRow[];
  const parsed = parsePostInsights(data);

  if (input.placement === "story") {
    parsed.engagement = parsed.shares + parsed.comments;
  } else {
    parsed.engagement = parsed.likes + parsed.comments + parsed.shares;
  }

  return { insight: parsed, error: null };
}
