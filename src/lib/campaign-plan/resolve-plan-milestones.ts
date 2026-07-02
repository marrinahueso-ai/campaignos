import {
  milestonesFromCommunicationSteps,
  resolveMetaArtworkMilestonesForEvent,
} from "@/lib/artwork-v2/campaign-phases";
import { getEventById } from "@/lib/events/queries";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { MetaArtworkMilestone } from "@/lib/artwork-v2/campaign-phases";

export const META_SOCIAL_CHANNELS: CommunicationChannel[] = ["facebook", "instagram"];

export { milestonesFromCommunicationSteps };

export async function resolveArtworkMilestonesForEvent(
  eventId: string,
): Promise<MetaArtworkMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const steps = await getEventCommunicationSteps(eventId);

  if (steps.length > 0) {
    return milestonesFromCommunicationSteps(steps);
  }

  return resolveMetaArtworkMilestonesForEvent({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });
}

/** Meta publish + caption milestones — Facebook and Instagram steps only. */
export async function resolveSocialMetaMilestonesForEvent(
  eventId: string,
): Promise<MetaArtworkMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const steps = await getEventCommunicationSteps(eventId);

  if (steps.length > 0) {
    return milestonesFromCommunicationSteps(steps, { socialOnly: true });
  }

  return resolveMetaArtworkMilestonesForEvent({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });
}
