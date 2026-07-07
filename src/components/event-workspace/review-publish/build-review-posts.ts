import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import {
  bundleHasReviewPublishContent,
  isReviewPublishVisibleBundle,
} from "@/lib/meta-publishing/bundle-display";
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
  selectedRelativeDay: number | null | undefined,
): MetaPublishBundle[] {
  const visible = bundles.filter(isReviewPublishVisibleBundle);

  if (selectedRelativeDay == null) {
    return visible;
  }

  const focusedVisible = visible.filter(
    (bundle) => bundle.relativeDay === selectedRelativeDay,
  );
  if (focusedVisible.length > 0) {
    return focusedVisible;
  }

  const focusedWithContent = bundles
    .filter((bundle) => bundle.relativeDay === selectedRelativeDay)
    .filter(bundleHasReviewPublishContent);
  if (focusedWithContent.length > 0) {
    return focusedWithContent;
  }

  return visible;
}
