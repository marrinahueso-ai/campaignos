import {
  getArtworkPhaseItems,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveMilestonePhaseAsset } from "@/lib/artwork-v2/milestone-assets";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";

async function getPhaseItemsForEvent(eventId: string) {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const communicationSteps = await getEventCommunicationSteps(eventId);

  return getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
    communicationSteps,
  });
}

function milestoneTitlesAtDay(
  steps: Awaited<ReturnType<typeof getEventCommunicationSteps>>,
  relativeDay: number,
): string[] {
  const titles = steps
    .filter((step) => step.relativeDay === relativeDay && step.status !== "skipped")
    .map((step) => step.title.trim())
    .filter(Boolean);

  return [...new Set(titles)];
}

export async function getApprovedFeedArtworkUrlForMilestone(input: {
  eventId: string;
  relativeDay: number;
}): Promise<string | null> {
  const phaseItems = await getPhaseItemsForEvent(input.eventId);
  const communicationSteps = await getEventCommunicationSteps(input.eventId);

  const feedPhase = phaseItems.find(
    (phase) =>
      phase.relativeDay === input.relativeDay && phase.metaPlacement === "feed",
  );

  if (!feedPhase) {
    return null;
  }

  const assets = await getCampaignAssetsForEvent(input.eventId);
  const feedAsset = resolveMilestonePhaseAsset(
    feedPhase,
    assets,
    milestoneTitlesAtDay(communicationSteps, input.relativeDay),
  );

  if (!isApprovedArtworkAsset(feedAsset) || !feedAsset?.storagePath) {
    return null;
  }

  return resolveAssetImageUrl(feedAsset.storagePath);
}

export async function getApprovedFeedArtworkByMilestone(
  eventId: string,
): Promise<Map<number, string>> {
  const phaseItems = await getPhaseItemsForEvent(eventId);
  const [assets, communicationSteps] = await Promise.all([
    getCampaignAssetsForEvent(eventId),
    getEventCommunicationSteps(eventId),
  ]);
  const urlsByDay = new Map<number, string>();

  for (const phase of phaseItems) {
    if (phase.metaPlacement !== "feed" || urlsByDay.has(phase.relativeDay)) {
      continue;
    }

    const feedAsset = resolveMilestonePhaseAsset(
      phase,
      assets,
      milestoneTitlesAtDay(communicationSteps, phase.relativeDay),
    );
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
