import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type {
  MetaPublishBundle,
  MetaPublishBundleStatus,
} from "@/lib/meta-publishing/types";

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

export function isReviewPublishVisibleBundle(bundle: MetaPublishBundle): boolean {
  return (
    bundle.isMetaPost &&
    bundle.status !== "skipped" &&
    REVIEW_PUBLISH_VISIBLE_STATUSES.includes(bundle.status)
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
