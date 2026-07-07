"use client";

import { CampaignArtworkPage } from "@/components/event-workspace/artwork/CampaignArtworkPage";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignArtworkStepProps {
  eventId: string;
  event: Event;
  organizationName?: string | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  communicationSteps: EventCommunicationStep[];
  assets: EventAsset[];
  metaPublishBundles?: MetaPublishBundle[];
  initialRelativeDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  onNavigateToCaptions?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
}

export function CampaignArtworkStep({
  eventId,
  event,
  organizationName = null,
  eventType,
  communicationStrategy,
  communicationSteps,
  assets,
  metaPublishBundles = [],
  initialRelativeDay = null,
  onFocusedMilestoneChange,
  onNavigateToCaptions,
  onWorkflowStepSelect,
}: CampaignArtworkStepProps) {
  return (
    <CampaignArtworkPage
      eventId={eventId}
      event={event}
      organizationName={organizationName}
      eventType={eventType}
      communicationStrategy={communicationStrategy}
      communicationSteps={communicationSteps}
      assets={assets}
      metaPublishBundles={metaPublishBundles}
      initialRelativeDay={initialRelativeDay}
      onFocusedMilestoneChange={onFocusedMilestoneChange}
      onNavigateToCaptions={onNavigateToCaptions}
      onWorkflowStepSelect={onWorkflowStepSelect}
    />
  );
}
