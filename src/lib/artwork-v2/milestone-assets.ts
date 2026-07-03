import {
  isApprovedArtworkAsset,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import type { ImageSizePreset } from "@/lib/ai-artwork/types";
import { resolveArtworkV2ImageSizePreset } from "@/lib/artwork-v2/image-size";
import type { EventAsset } from "@/types/event-workspace";

/** Story slot incorrectly holds the same file (or row) as feed — not a real 9:16 approval. */
export function storyDuplicatedFeedArtwork(
  feedAsset: EventAsset | null,
  storyAsset: EventAsset | null,
): boolean {
  if (!feedAsset || !storyAsset) {
    return false;
  }

  if (feedAsset.id === storyAsset.id) {
    return true;
  }

  if (!feedAsset.storagePath || !storyAsset.storagePath) {
    return false;
  }

  return feedAsset.storagePath === storyAsset.storagePath;
}

export function resolveMilestoneFeedAsset(
  feedItem: ArtworkPhaseWorkflowItem,
  assets: EventAsset[],
): EventAsset | null {
  return resolveWorkflowAsset(feedItem, null, assets);
}

export function resolveMilestoneStoryAsset(
  storyItem: ArtworkPhaseWorkflowItem,
  assets: EventAsset[],
): EventAsset | null {
  return resolveWorkflowAsset(storyItem, null, assets);
}

export function expectedImageSizePresetForPhaseItem(
  item: ArtworkPhaseWorkflowItem,
): ImageSizePreset {
  return resolveArtworkV2ImageSizePreset(item);
}

export function isStoryMilestoneDistinctlyApproved(
  feedItem: ArtworkPhaseWorkflowItem,
  storyItem: ArtworkPhaseWorkflowItem,
  assets: EventAsset[],
): boolean {
  const storyAsset = resolveMilestoneStoryAsset(storyItem, assets);
  if (!isApprovedArtworkAsset(storyAsset)) {
    return false;
  }

  const feedAsset = resolveMilestoneFeedAsset(feedItem, assets);
  return !storyDuplicatedFeedArtwork(feedAsset, storyAsset);
}

export function conceptMatchesWorkflowItemPreset(
  item: ArtworkPhaseWorkflowItem,
  imageSizePreset: ImageSizePreset | null | undefined,
): boolean {
  if (!imageSizePreset) {
    return true;
  }

  return imageSizePreset === expectedImageSizePresetForPhaseItem(item);
}
