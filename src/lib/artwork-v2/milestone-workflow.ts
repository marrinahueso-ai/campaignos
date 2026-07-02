import {
  groupArtworkPhasesByMilestone,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";

export function findMilestoneFeedItem(
  phaseItems: ArtworkPhaseWorkflowItem[],
  relativeDay: number,
): ArtworkPhaseWorkflowItem | null {
  return (
    phaseItems.find(
      (item) => item.relativeDay === relativeDay && item.metaPlacement === "feed",
    ) ?? null
  );
}

export function findMilestoneStoryItem(
  phaseItems: ArtworkPhaseWorkflowItem[],
  relativeDay: number,
): ArtworkPhaseWorkflowItem | null {
  return (
    phaseItems.find(
      (item) => item.relativeDay === relativeDay && item.metaPlacement === "story",
    ) ?? null
  );
}

export function nextMilestoneFeedItem(
  phaseItems: ArtworkPhaseWorkflowItem[],
  currentRelativeDay: number,
): ArtworkPhaseWorkflowItem | null {
  const groups = groupArtworkPhasesByMilestone(phaseItems);
  const currentIndex = groups.findIndex((group) => group.relativeDay === currentRelativeDay);
  const nextGroup = currentIndex >= 0 ? groups[currentIndex + 1] : null;
  return nextGroup ? findMilestoneFeedItem(nextGroup.formats, nextGroup.relativeDay) : null;
}
