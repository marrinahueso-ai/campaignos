import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType, EventCommunicationStep } from "@/types/playbooks";
import type { EventAsset } from "@/types/event-workspace";
import { getArtworkPhaseItems } from "@/lib/artwork-v2/campaign-phases";
import {
  DEFAULT_ARTWORK_WORKFLOW_ITEMS,
  EXTENDED_ARTWORK_WORKFLOW_ITEMS,
  type ArtworkWorkflowItem,
} from "@/lib/creative-studio/artwork-workflow";

/** Event types that commonly need a print flyer — not forced on meetings or recognition. */
export const FLYER_EVENT_TYPES: EventType[] = [
  "book_fair",
  "family_event",
  "fundraiser",
  "volunteer_drive",
  "spirit_night",
];

export function shouldSuggestFlyerArtwork(eventType: EventType | null): boolean {
  return Boolean(eventType && FLYER_EVENT_TYPES.includes(eventType));
}

export function shouldShowArtworkWorkflow(
  communicationStrategy: CommunicationStrategy,
): boolean {
  return (
    communicationStrategy === "full_campaign" ||
    communicationStrategy === "reminder_only"
  );
}

function hasExistingArtworkForItem(
  item: ArtworkWorkflowItem,
  assets: EventAsset[],
): boolean {
  return assets.some(
    (asset) =>
      asset.planLabel === item.planLabel &&
      asset.assetType === item.assetType &&
      (asset.status === "uploaded" ||
        asset.planStatus === "generated" ||
        asset.planStatus === "approved" ||
        asset.planStatus === "in_progress"),
  );
}

/** Phase-first artwork checklist aligned to the communication plan timing. */
export function getArtworkWorkflowItems(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  assets?: EventAsset[];
  communicationSteps?: EventCommunicationStep[];
}): ArtworkWorkflowItem[] {
  const phaseItems = getArtworkPhaseItems({
    eventType: input.eventType,
    communicationStrategy: input.communicationStrategy,
    communicationSteps: input.communicationSteps,
  });

  if (phaseItems.length > 0) {
    return phaseItems;
  }

  return getLegacyArtworkWorkflowItems(input);
}

function getLegacyArtworkWorkflowItems(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  assets?: EventAsset[];
}): ArtworkWorkflowItem[] {
  if (!shouldShowArtworkWorkflow(input.communicationStrategy)) {
    return [];
  }

  const assets = input.assets ?? [];
  const items: ArtworkWorkflowItem[] = [...DEFAULT_ARTWORK_WORKFLOW_ITEMS];

  if (shouldSuggestFlyerArtwork(input.eventType)) {
    const flyer = EXTENDED_ARTWORK_WORKFLOW_ITEMS.find((entry) => entry.id === "flyer");
    if (flyer && !items.some((entry) => entry.id === "flyer")) {
      items.push(flyer);
    }
  }

  for (const optional of EXTENDED_ARTWORK_WORKFLOW_ITEMS) {
    if (optional.id === "flyer") continue;
    if (items.some((entry) => entry.id === optional.id)) continue;
    if (hasExistingArtworkForItem(optional, assets)) {
      items.push(optional);
    }
  }

  return items;
}
