import {
  getArtworkPhaseItems,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";

export async function getApprovedFeedArtworkUrlForMilestone(input: {
  eventId: string;
  relativeDay: number;
}): Promise<string | null> {
  const event = await getEventById(input.eventId);
  if (!event) {
    return null;
  }

  const phaseItems = getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });

  const feedPhase = phaseItems.find(
    (phase) =>
      phase.relativeDay === input.relativeDay && phase.metaPlacement === "feed",
  );

  if (!feedPhase) {
    return null;
  }

  const assets = await getCampaignAssetsForEvent(input.eventId);
  const feedAsset = resolveWorkflowAsset(feedPhase, null, assets);

  if (!isApprovedArtworkAsset(feedAsset) || !feedAsset?.storagePath) {
    return null;
  }

  return resolveAssetImageUrl(feedAsset.storagePath);
}

export async function getApprovedFeedArtworkByMilestone(
  eventId: string,
): Promise<Map<number, string>> {
  const event = await getEventById(eventId);
  if (!event) {
    return new Map();
  }

  const phaseItems = getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });

  const assets = await getCampaignAssetsForEvent(eventId);
  const urlsByDay = new Map<number, string>();

  for (const phase of phaseItems) {
    if (phase.metaPlacement !== "feed" || urlsByDay.has(phase.relativeDay)) {
      continue;
    }

    const feedAsset = resolveWorkflowAsset(phase, null, assets);
    if (!isApprovedArtworkAsset(feedAsset) || !feedAsset?.storagePath) {
      continue;
    }

    const url = resolveAssetImageUrl(feedAsset.storagePath);
    if (url) {
      urlsByDay.set(phase.relativeDay, url);
    }
  }

  return urlsByDay;
}
