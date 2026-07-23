import "server-only";

import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { buildEventViewsComparison, buildEventViewsSeries } from "@/lib/insights/event-comparison";
import { getInsightsConnectionHealth } from "@/lib/insights/queries";
import type {
  EventInsightsComparison,
  EventInsightsPageData,
  EventInsightsPost,
} from "@/lib/insights/types";
import {
  extractPostDisplayFields,
  extractViewsFromRawMetrics,
} from "@/lib/meta/insights-normalize";
import { createClient } from "@/lib/supabase/server";

type PublishedSlotRow = {
  id: string;
  external_post_id: string;
  platform: "facebook" | "instagram";
  placement: "feed" | "story" | null;
  milestone_title: string | null;
  published_at: string | null;
  event_asset_id: string | null;
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
  clicks: number;
  raw_metrics: Record<string, unknown> | null;
  meta_publication_slot_id: string | null;
  synced_at: string | null;
};

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

function rowViews(row: Pick<PostInsightRow, "raw_metrics" | "reach">): number {
  return extractViewsFromRawMetrics(row.raw_metrics, Number(row.reach) || 0);
}

function rowEngagement(row: Pick<PostInsightRow, "engagement" | "likes" | "comments" | "shares">): number {
  const stored = Number(row.engagement) || 0;
  if (stored > 0) {
    return stored;
  }
  return (Number(row.likes) || 0) + (Number(row.comments) || 0) + (Number(row.shares) || 0);
}

function resolveExternalPostUrl(
  platform: "facebook" | "instagram",
  externalPostId: string,
  rawMetrics: Record<string, unknown> | null,
): string | null {
  const fromRaw =
    typeof rawMetrics?.permalink === "string" && rawMetrics.permalink.trim()
      ? rawMetrics.permalink.trim()
      : typeof rawMetrics?.permalink_url === "string" &&
          rawMetrics.permalink_url.trim()
        ? rawMetrics.permalink_url.trim()
        : null;
  if (fromRaw) {
    return fromRaw;
  }

  if (platform === "facebook" && externalPostId.includes("_")) {
    const [, postId] = externalPostId.split("_");
    if (postId) {
      return `https://www.facebook.com/${postId}`;
    }
  }

  return null;
}

function buildComparisonMessage(
  direction: "more" | "fewer",
): EventInsightsComparison {
  return {
    metric: "views",
    direction,
    highlight: `${direction} views`,
    messageBefore: "This event's posts received ",
    messageAfter: " than your typical event posts.",
  };
}

async function fetchPublishedSlotsForEvent(
  eventId: string,
): Promise<PublishedSlotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select(
      "id, external_post_id, platform, placement, milestone_title, published_at, event_asset_id",
    )
    .eq("event_id", eventId)
    .eq("status", "published")
    .not("external_post_id", "is", null);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to fetch event publication slots:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => Boolean(row.external_post_id))
    .map((row) => ({
      id: row.id as string,
      external_post_id: row.external_post_id as string,
      platform: row.platform as "facebook" | "instagram",
      placement: (row.placement as "feed" | "story" | null) ?? null,
      milestone_title: (row.milestone_title as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      event_asset_id: (row.event_asset_id as string | null) ?? null,
    }));
}

async function fetchPostInsightsForSlots(
  organizationId: string,
  slotIds: string[],
  externalPostIds: string[],
): Promise<PostInsightRow[]> {
  if (slotIds.length === 0 && externalPostIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const select =
    "id, external_post_id, platform, placement, post_title, published_at, reach, engagement, likes, comments, shares, clicks, raw_metrics, meta_publication_slot_id, synced_at";

  const [bySlot, byExternal] = await Promise.all([
    slotIds.length > 0
      ? supabase
          .from("social_post_insights")
          .select(select)
          .eq("organization_id", organizationId)
          .in("meta_publication_slot_id", slotIds)
      : Promise.resolve({ data: [] as PostInsightRow[], error: null }),
    externalPostIds.length > 0
      ? supabase
          .from("social_post_insights")
          .select(select)
          .eq("organization_id", organizationId)
          .in("external_post_id", externalPostIds)
      : Promise.resolve({ data: [] as PostInsightRow[], error: null }),
  ]);

  if (bySlot.error && bySlot.error.code !== "42P01") {
    console.error("Failed to fetch event post insights by slot:", bySlot.error.message);
  }
  if (byExternal.error && byExternal.error.code !== "42P01") {
    console.error(
      "Failed to fetch event post insights by external id:",
      byExternal.error.message,
    );
  }

  const byId = new Map<string, PostInsightRow>();
  for (const row of [
    ...((bySlot.data ?? []) as PostInsightRow[]),
    ...((byExternal.data ?? []) as PostInsightRow[]),
  ]) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function enrichEventPosts(input: {
  eventId: string;
  slots: PublishedSlotRow[];
  insights: PostInsightRow[];
}): Promise<EventInsightsPost[]> {
  const supabase = await createClient();
  const insightBySlotId = new Map<string, PostInsightRow>();
  const insightByExternalId = new Map<string, PostInsightRow>();

  for (const row of input.insights) {
    if (row.meta_publication_slot_id) {
      insightBySlotId.set(row.meta_publication_slot_id, row);
    }
    insightByExternalId.set(row.external_post_id, row);
  }

  const assetIds = input.slots
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

  const { data: approvals } = await supabase
    .from("approval_scheduling_items")
    .select(
      "milestone_name, caption_text, story_caption, feed_artwork_url, story_artwork_url",
    )
    .eq("event_id", input.eventId);

  const approvalRows = (approvals ?? []).map((row) => ({
    milestone_name: String(row.milestone_name ?? ""),
    caption_text: (row.caption_text as string | null) ?? null,
    story_caption: (row.story_caption as string | null) ?? null,
    feed_artwork_url: (row.feed_artwork_url as string | null) ?? null,
    story_artwork_url: (row.story_artwork_url as string | null) ?? null,
  }));

  const posts: EventInsightsPost[] = input.slots.map((slot) => {
    const insight =
      insightBySlotId.get(slot.id) ??
      insightByExternalId.get(slot.external_post_id) ??
      null;

    const syncedDisplay = extractPostDisplayFields(insight?.raw_metrics ?? null);
    let thumbnailUrl: string | null = syncedDisplay.thumbnailUrl;
    let caption: string | null = syncedDisplay.caption;

    if (slot.event_asset_id) {
      thumbnailUrl = assetUrlById.get(slot.event_asset_id) ?? thumbnailUrl;
    }

    const match =
      approvalRows.find(
        (entry) =>
          entry.milestone_name.trim().toLowerCase() ===
          (slot.milestone_title ?? "").trim().toLowerCase(),
      ) ?? approvalRows[0];

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

    const views = insight ? rowViews(insight) : 0;
    const interactions = insight ? rowEngagement(insight) : 0;

    return {
      id: insight?.id ?? slot.id,
      slotId: slot.id,
      title: slot.milestone_title || insight?.post_title || "Published post",
      captionSnippet:
        captionSnippet(caption) ??
        captionSnippet(insight?.post_title) ??
        captionSnippet(slot.milestone_title),
      thumbnailUrl,
      platform: insight?.platform ?? slot.platform,
      placement: insight?.placement ?? slot.placement,
      publishedAt: insight?.published_at ?? slot.published_at,
      views,
      reach: insight ? Number(insight.reach) || 0 : 0,
      interactions,
      likes: insight ? Number(insight.likes) || 0 : 0,
      comments: insight ? Number(insight.comments) || 0 : 0,
      shares: insight ? Number(insight.shares) || 0 : 0,
      linkClicks: insight ? Number(insight.clicks) || 0 : 0,
      externalPostId: slot.external_post_id,
      externalUrl: resolveExternalPostUrl(
        insight?.platform ?? slot.platform,
        slot.external_post_id,
        insight?.raw_metrics ?? null,
      ),
    };
  });

  return posts.sort((a, b) => {
    if (b.views !== a.views) {
      return b.views - a.views;
    }
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function getEventInsightsPageData(
  eventId: string,
): Promise<EventInsightsPageData | null> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const connection = await getInsightsConnectionHealth(organization.id);
  const slots = await fetchPublishedSlotsForEvent(eventId);
  const insights = await fetchPostInsightsForSlots(
    organization.id,
    slots.map((slot) => slot.id),
    slots.map((slot) => slot.external_post_id),
  );

  const posts = await enrichEventPosts({ eventId, slots, insights });
  const hasSyncedMetrics = insights.length > 0;

  let emptyState: EventInsightsPageData["emptyState"] = null;
  if (!connection.metaConnected) {
    emptyState = "connect";
  } else if (slots.length === 0) {
    emptyState = "no_posts";
  } else if (!hasSyncedMetrics) {
    emptyState = "sync";
  }

  const kpis = {
    views: posts.reduce((sum, post) => sum + post.views, 0),
    reach: posts.reduce((sum, post) => sum + post.reach, 0),
    interactions: posts.reduce((sum, post) => sum + post.interactions, 0),
    linkClicks: posts.reduce((sum, post) => sum + post.linkClicks, 0),
    likes: posts.reduce((sum, post) => sum + post.likes, 0),
  };

  const comparisonResult = buildEventViewsComparison(posts.map((post) => post.views));
  const comparison = comparisonResult
    ? buildComparisonMessage(comparisonResult.direction)
    : null;

  const viewsSeries = buildEventViewsSeries(
    posts.map((post) => ({
      publishedAt: post.publishedAt,
      views: post.views,
    })),
  );

  const latestInsightSync = insights
    .map((row) => row.synced_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0];

  return {
    eventId,
    connection,
    kpis,
    comparison,
    viewsSeries,
    posts,
    publishedSlotCount: slots.length,
    hasSyncedMetrics,
    emptyState,
    lastSyncAt: latestInsightSync ?? connection.lastSyncAt,
    syncInProgress: connection.lastSyncStatus === "running",
  };
}
