import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import { isReviewPublishVisibleBundle } from "@/lib/meta-publishing/bundle-display";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

export type ReviewPublishPlacement = "feed" | "story";

export interface ReviewPublishPost {
  id: string;
  relativeDay: number;
  milestoneTitle: string;
  placement: ReviewPublishPlacement;
  artworkUrl: string | null;
  captionPreview: string;
}

function resolveStoryCaptionDisplay(
  feedCaption: string,
  storyCaption: string,
): string {
  if (!storyCaption) {
    return feedCaption;
  }

  const feedPrefix = feedCaption.slice(0, storyCaption.length);
  if (storyCaption === feedPrefix || storyCaption === feedCaption) {
    return feedCaption;
  }

  return storyCaption;
}

function truncateCaption(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function buildReviewPostsFromBundles(
  bundles: MetaPublishBundle[],
): ReviewPublishPost[] {
  const posts: ReviewPublishPost[] = [];

  for (const bundle of bundles) {
    if (!isReviewPublishVisibleBundle(bundle)) {
      continue;
    }

    const feedCaption = bundle.captionPreview?.trim() ?? "";
    const storyCaption = bundle.storyCaptionPreview?.trim() ?? "";
    const storyDisplay = resolveStoryCaptionDisplay(feedCaption, storyCaption);

    if (isFeedSurfaceEnabled(bundle.metaPublishSurfaces)) {
      posts.push({
        id: `${bundle.relativeDay}-feed`,
        relativeDay: bundle.relativeDay,
        milestoneTitle: bundle.title,
        placement: "feed",
        artworkUrl: bundle.feedArtworkUrl,
        captionPreview: truncateCaption(feedCaption || "No feed caption yet."),
      });
    }

    if (isStorySurfaceEnabled(bundle.metaPublishSurfaces)) {
      posts.push({
        id: `${bundle.relativeDay}-story`,
        relativeDay: bundle.relativeDay,
        milestoneTitle: bundle.title,
        placement: "story",
        artworkUrl: bundle.storyArtworkUrl ?? bundle.feedArtworkUrl,
        captionPreview: truncateCaption(storyDisplay || "No story caption yet."),
      });
    }
  }

  return posts;
}

export function resolveFocusBundles(
  bundles: MetaPublishBundle[],
  initialExpandedDay: number | null | undefined,
): MetaPublishBundle[] {
  if (initialExpandedDay == null) {
    return bundles.filter(isReviewPublishVisibleBundle);
  }

  const focused = bundles.filter((bundle) => bundle.relativeDay === initialExpandedDay);
  return focused.length > 0 ? focused : bundles.filter(isReviewPublishVisibleBundle);
}
