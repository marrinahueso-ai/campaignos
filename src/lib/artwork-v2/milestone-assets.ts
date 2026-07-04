import {
  isApprovedArtworkAsset,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveWorkflowAsset, type ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import type { ImageSizePreset } from "@/lib/ai-artwork/types";
import { resolveArtworkV2ImageSizePreset } from "@/lib/artwork-v2/image-size";
import type { EventAsset } from "@/types/event-workspace";

function buildPhasePlanLabel(title: string, formatLabel: string): string {
  return `${title} — ${formatLabel}`;
}

/** Resolve artwork for a milestone phase, including legacy plan labels after renames. */
export function resolveMilestonePhaseAsset(
  item: ArtworkWorkflowItem,
  assets: EventAsset[],
  alternateTitles: string[] = [],
): EventAsset | null {
  const direct = resolveWorkflowAsset(item, null, assets);
  if (direct) {
    return direct;
  }

  if (!item.formatLabel) {
    return null;
  }

  const titles = [
    item.label,
    ...alternateTitles.filter((title) => title !== item.label),
  ];

  for (const title of titles) {
    const candidate =
      assets.find(
        (asset) =>
          asset.planLabel === buildPhasePlanLabel(title, item.formatLabel!) &&
          asset.assetType === item.assetType,
      ) ?? null;

    if (!candidate) {
      continue;
    }

    if (item.metaPlacement === "story" && candidate.assetType !== "instagram_story") {
      continue;
    }

    if (item.metaPlacement === "feed" && candidate.assetType === "instagram_story") {
      continue;
    }

    return candidate;
  }

  return null;
}

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
  alternateTitles: string[] = [],
): EventAsset | null {
  return resolveMilestonePhaseAsset(feedItem, assets, alternateTitles);
}

export function resolveMilestoneStoryAsset(
  storyItem: ArtworkPhaseWorkflowItem,
  assets: EventAsset[],
  alternateTitles: string[] = [],
): EventAsset | null {
  return resolveMilestonePhaseAsset(storyItem, assets, alternateTitles);
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
  alternateTitles: string[] = [],
): boolean {
  const storyAsset = resolveMilestoneStoryAsset(storyItem, assets, alternateTitles);
  if (!isApprovedArtworkAsset(storyAsset)) {
    return false;
  }

  const feedAsset = resolveMilestoneFeedAsset(feedItem, assets, alternateTitles);
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
