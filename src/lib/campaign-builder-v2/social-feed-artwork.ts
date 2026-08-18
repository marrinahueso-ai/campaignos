import "server-only";

import { cache } from "react";
import { extractCampaignSocialFeedUrl } from "@/lib/campaign-builder-v2/extract-social-feed-url";
import { createClient } from "@/lib/supabase/server";

async function loadCampaignSocialFeedUrlMapUncached(
  eventIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(eventIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_builder_sessions")
    .select("event_id, session_data")
    .in("event_id", unique);

  if (error) {
    console.error("Failed to load campaign social artwork for flyers:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const eventId = String(row.event_id ?? "").trim();
    if (!eventId) continue;
    const url = extractCampaignSocialFeedUrl(row.session_data);
    if (url) map.set(eventId, url);
  }

  return map;
}

const getCampaignSocialFeedUrlMapCached = cache(
  async (cacheKey: string): Promise<Map<string, string>> => {
    const eventIds = cacheKey.length > 0 ? cacheKey.split("\0") : [];
    return loadCampaignSocialFeedUrlMapUncached(eventIds);
  },
);

/** Batch Event Image / social feed URLs from campaign-builder sessions. */
export async function getCampaignSocialFeedUrlMap(
  eventIds: string[],
): Promise<Map<string, string>> {
  const uniqueSorted = [...new Set(eventIds.filter(Boolean))].sort();
  return getCampaignSocialFeedUrlMapCached(uniqueSorted.join("\0"));
}
