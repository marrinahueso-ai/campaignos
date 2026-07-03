import {
  groupArtworkPhasesByMilestone,
  isApprovedArtworkAsset,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";
import {
  findMilestoneFeedItem,
  findMilestoneStoryItem,
} from "@/lib/artwork-v2/milestone-workflow";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import type { EventAsset } from "@/types/event-workspace";

export type MilestoneArtworkStatus =
  | "complete"
  | "ready_for_review"
  | "in_progress"
  | "not_started";

export interface RemainingArtworkMilestone {
  relativeDay: number;
  title: string;
}

function isAssetReadyForReview(asset: EventAsset | null): boolean {
  return (
    Boolean(asset) &&
    !isApprovedArtworkAsset(asset) &&
    (asset!.planStatus === "generated" || asset!.planStatus === "in_progress")
  );
}

export function resolveMilestoneArtworkStatus(
  relativeDay: number,
  phaseItems: ArtworkPhaseWorkflowItem[],
  assets: EventAsset[],
): MilestoneArtworkStatus {
  const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
  const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
  if (!feedItem) {
    return "not_started";
  }

  const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
  const storyAsset = storyItem ? resolveWorkflowAsset(storyItem, null, assets) : null;
  const feedApproved = isApprovedArtworkAsset(feedAsset);
  const storyApproved = storyItem ? isApprovedArtworkAsset(storyAsset) : true;

  if (feedApproved && storyApproved) {
    return "complete";
  }

  if (isAssetReadyForReview(feedAsset) || isAssetReadyForReview(storyAsset)) {
    return "ready_for_review";
  }

  if (feedApproved || storyApproved) {
    return "in_progress";
  }

  return "not_started";
}

export function canShowGenerateRemainingButton(
  phaseItems: ArtworkPhaseWorkflowItem[],
  assets: EventAsset[],
): boolean {
  const groups = groupArtworkPhasesByMilestone(phaseItems);
  let hasCompleteMilestone = false;
  let hasIncompleteFeed = false;

  for (const group of groups) {
    const feedItem = findMilestoneFeedItem(phaseItems, group.relativeDay);
    if (!feedItem) {
      continue;
    }

    const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
    const storyItem = findMilestoneStoryItem(phaseItems, group.relativeDay);
    const storyAsset = storyItem ? resolveWorkflowAsset(storyItem, null, assets) : null;
    const feedApproved = isApprovedArtworkAsset(feedAsset);
    const storyApproved = storyItem ? isApprovedArtworkAsset(storyAsset) : true;

    if (feedApproved && storyApproved) {
      hasCompleteMilestone = true;
    }

    if (!feedApproved) {
      hasIncompleteFeed = true;
    }
  }

  return hasCompleteMilestone && hasIncompleteFeed;
}

export function findAnchorInspirationFeedAsset(
  phaseItems: ArtworkPhaseWorkflowItem[],
  assets: EventAsset[],
  anchorRelativeDay?: number,
): EventAsset | null {
  if (anchorRelativeDay != null) {
    const feedItem = findMilestoneFeedItem(phaseItems, anchorRelativeDay);
    if (feedItem) {
      const asset = resolveWorkflowAsset(feedItem, null, assets);
      if (isApprovedArtworkAsset(asset)) {
        return asset;
      }
    }
  }

  for (const group of groupArtworkPhasesByMilestone(phaseItems)) {
    const feedItem = findMilestoneFeedItem(phaseItems, group.relativeDay);
    if (!feedItem) {
      continue;
    }

    const asset = resolveWorkflowAsset(feedItem, null, assets);
    if (isApprovedArtworkAsset(asset)) {
      return asset;
    }
  }

  return null;
}

export function getRemainingArtworkMilestones(
  phaseItems: ArtworkPhaseWorkflowItem[],
  assets: EventAsset[],
): RemainingArtworkMilestone[] {
  return groupArtworkPhasesByMilestone(phaseItems)
    .filter((group) => {
      const feedItem = findMilestoneFeedItem(phaseItems, group.relativeDay);
      if (!feedItem) {
        return false;
      }

      const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
      return !isApprovedArtworkAsset(feedAsset);
    })
    .map((group) => ({
      relativeDay: group.relativeDay,
      title: group.title,
    }));
}
