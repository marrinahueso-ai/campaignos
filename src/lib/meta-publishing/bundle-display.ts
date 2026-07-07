import {
  isFeedSurfaceEnabled,
  isStoryAutoPublishEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import { isManualStoryOnlyBundle } from "@/lib/meta-publishing/publish-mode";
import { findMetaPublishBundleForDay } from "@/lib/meta-publishing/milestone-workflow-badge";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type {
  MetaPublishBundle,
  MetaPublishBundleStatus,
} from "@/lib/meta-publishing/types";

export function findMetaPublishBundleForMilestoneDay(
  bundles: MetaPublishBundle[],
  relativeDay: number,
): MetaPublishBundle | undefined {
  return (
    bundles.find(
      (candidate) =>
        candidate.isMetaPost &&
        candidate.relativeDay === relativeDay &&
        candidate.status !== "skipped",
    ) ?? findMetaPublishBundleForDay(bundles, relativeDay)
  );
}

/** Surface-aware artwork readiness — matches publish targets, not raw missingArtwork. */
export function isBundleArtworkComplete(bundle: MetaPublishBundle | undefined): boolean {
  if (!bundle) {
    return false;
  }

  const needsFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const needsStory = isStoryAutoPublishEnabled(
    bundle.metaPublishSurfaces,
    bundle.storyManualPublish,
  );
  const hasFeed = Boolean(bundle.feedArtworkUrl);
  const hasStory = Boolean(bundle.storyArtworkUrl);

  return (!needsFeed || hasFeed) && (!needsStory || hasStory);
}

export function channelLabelForBundle(bundle: MetaPublishBundle): string {
  if (!bundle.channel) {
    return "Other channel";
  }

  return CHANNEL_LABELS[bundle.channel] ?? bundle.channel;
}

const REVIEW_PUBLISH_VISIBLE_STATUSES: MetaPublishBundleStatus[] = [
  "ready",
  "scheduled",
  "approved",
  "failed",
  "needs_artwork",
  "needs_caption",
];

const REVIEW_PUBLISH_SCHEDULABLE_STATUSES: MetaPublishBundleStatus[] = [
  "ready",
  "scheduled",
  "approved",
  "failed",
];

function bundleHasPublishPath(bundle: MetaPublishBundle): boolean {
  return bundleHasAutoPublishTargets(bundle) || bundleIsManualStoryOnly(bundle);
}

export function bundleHasReviewPublishContent(bundle: MetaPublishBundle): boolean {
  if (!bundle.isMetaPost || bundle.status === "skipped") {
    return false;
  }

  const hasCaption =
    Boolean(bundle.captionPreview?.trim()) ||
    Boolean(bundle.storyCaptionPreview?.trim());
  const hasArtwork =
    Boolean(bundle.feedArtworkUrl) || Boolean(bundle.storyArtworkUrl);

  return hasCaption && hasArtwork;
}

export function bundleHasAutoPublishTargets(bundle: MetaPublishBundle): boolean {
  return bundle.isMetaPost && bundle.targets.length > 0;
}

export function bundleIsManualStoryOnly(bundle: MetaPublishBundle): boolean {
  return (
    bundle.isMetaPost &&
    isManualStoryOnlyBundle(bundle.metaPublishSurfaces, bundle.storyManualPublish)
  );
}

/** True when this milestone can be scheduled or rescheduled from Review & publish. */
export function bundleIsSchedulable(bundle: MetaPublishBundle): boolean {
  if (!bundle.isMetaPost || bundle.status === "skipped") {
    return false;
  }

  if (!bundleHasPublishPath(bundle)) {
    return false;
  }

  if (REVIEW_PUBLISH_SCHEDULABLE_STATUSES.includes(bundle.status)) {
    return true;
  }

  // Review UI shows caption + artwork previews while formal status is still needs_*.
  if (
    (bundle.status === "needs_caption" || bundle.status === "needs_artwork") &&
    bundleHasReviewPublishContent(bundle)
  ) {
    return true;
  }

  return false;
}

export function reviewPublishMilestoneStatusLabel(
  status: MetaPublishBundleStatus | undefined,
): string {
  switch (status) {
    case "scheduled":
    case "approved":
    case "posting":
      return "Scheduled";
    case "published":
      return "Published";
    case "failed":
      return "Failed";
    case "ready":
      return "Ready";
    default:
      return "In review";
  }
}

export function resolveReviewPublishScheduleBlockedMessage(
  focusBundles: MetaPublishBundle[],
): string {
  return resolveReviewPublishActionBlockedMessage(focusBundles, "schedule");
}

export function resolveReviewPublishPublishBlockedMessage(
  focusBundles: MetaPublishBundle[],
): string {
  return resolveReviewPublishActionBlockedMessage(focusBundles, "publish");
}

function resolveReviewPublishActionBlockedMessage(
  focusBundles: MetaPublishBundle[],
  action: "schedule" | "publish",
): string {
  const primary = focusBundles[0];
  if (!primary) {
    return action === "schedule"
      ? "No milestones are ready to schedule yet."
      : "Nothing ready to publish yet.";
  }

  if (["published", "posting"].includes(primary.status)) {
    return "This milestone has already been published.";
  }

  if (!bundleHasPublishPath(primary)) {
    return "Select at least one platform with publishing enabled.";
  }

  if (primary.status === "needs_artwork" || primary.status === "needs_caption") {
    return action === "schedule"
      ? "Approve artwork and captions before scheduling."
      : "Approve artwork and captions before publishing.";
  }

  return action === "schedule"
    ? "No milestones are ready to schedule yet."
    : "Nothing ready to publish yet.";
}

export function isReviewPublishVisibleBundle(bundle: MetaPublishBundle): boolean {
  if (!bundle.isMetaPost || bundle.status === "skipped") {
    return false;
  }

  return (
    REVIEW_PUBLISH_VISIBLE_STATUSES.includes(bundle.status) ||
    bundleHasReviewPublishContent(bundle)
  );
}

export function allReviewPublishMetaBundlesHandled(
  bundles: MetaPublishBundle[],
): boolean {
  const activeMetaBundles = bundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );

  if (activeMetaBundles.length === 0) {
    return false;
  }

  return activeMetaBundles.every(
    (bundle) => bundle.status === "published" || bundle.status === "posting",
  );
}
