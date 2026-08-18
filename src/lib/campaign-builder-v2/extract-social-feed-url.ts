import { sanitizeArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";

function isUsableSocialImageUrl(url: string | null): url is string {
  if (!url) return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  );
}

function feedOrStoryUrl(artwork: unknown): string | null {
  if (!artwork || typeof artwork !== "object") return null;
  const row = artwork as { feedUrl?: string | null; storyUrl?: string | null };
  const feed = sanitizeArtworkUrl(row.feedUrl);
  if (isUsableSocialImageUrl(feed)) return feed;
  const story = sanitizeArtworkUrl(row.storyUrl);
  if (isUsableSocialImageUrl(story)) return story;
  return null;
}

/**
 * Pull the Event Image / first social post artwork out of a campaign-builder
 * session JSON blob. Feed (1:1) wins over story.
 */
export function extractCampaignSocialFeedUrl(
  sessionData: unknown,
): string | null {
  if (!sessionData || typeof sessionData !== "object") return null;
  const raw = sessionData as {
    mainEventImage?: unknown;
    previewContents?: unknown;
  };

  const fromMain = feedOrStoryUrl(raw.mainEventImage);
  if (fromMain) return fromMain;

  if (!Array.isArray(raw.previewContents)) return null;
  for (const preview of raw.previewContents) {
    if (!preview || typeof preview !== "object") continue;
    const fromPost = feedOrStoryUrl(
      (preview as { artwork?: unknown }).artwork,
    );
    if (fromPost) return fromPost;
  }

  return null;
}
