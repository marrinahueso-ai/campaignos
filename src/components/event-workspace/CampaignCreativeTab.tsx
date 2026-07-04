"use client";

import { ArtworkV2Shell } from "@/components/artwork-v2/ArtworkV2Shell";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignCreativeTabProps {
  eventId: string;
  event: Event;
  organizationName?: string | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  communicationSteps: EventCommunicationStep[];
  assets: EventAsset[];
  metaPublishBundles?: MetaPublishBundle[];
  onNavigateToCaptions?: (relativeDay: number) => void;
}

export function CampaignCreativeTab({
  eventId,
  event,
  organizationName = null,
  eventType,
  communicationStrategy,
  communicationSteps,
  assets,
  metaPublishBundles = [],
  onNavigateToCaptions,
}: CampaignCreativeTabProps) {
  return (
    <ArtworkV2Shell
      eventId={eventId}
      event={event}
      organizationName={organizationName}
      eventType={eventType}
      communicationStrategy={communicationStrategy}
      communicationSteps={communicationSteps}
      assets={assets}
      metaPublishBundles={metaPublishBundles}
      onNavigateToCaptions={onNavigateToCaptions}
    />
  );
}
