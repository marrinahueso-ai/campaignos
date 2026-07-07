"use client";

import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { ArtworkV2Shell } from "@/components/artwork-v2/ArtworkV2Shell";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignArtworkPageProps {
  eventId: string;
  event: Event;
  organizationName?: string | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  communicationSteps: EventCommunicationStep[];
  assets: EventAsset[];
  metaPublishBundles?: MetaPublishBundle[];
  onNavigateToCaptions?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
}

export function CampaignArtworkPage({
  eventId,
  event,
  organizationName = null,
  eventType,
  communicationStrategy,
  communicationSteps,
  assets,
  metaPublishBundles = [],
  onNavigateToCaptions,
  onWorkflowStepSelect,
}: CampaignArtworkPageProps) {
  return (
    <div className="overflow-hidden border border-cos-border bg-cos-card">
      <CaptionsProgressStepper
        activeStep="artwork"
        completedSteps={["plan"]}
        onStepSelect={onWorkflowStepSelect}
      />

      <div className="p-5 lg:p-6">
        <ArtworkV2Shell
          variant="campaign"
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
      </div>
    </div>
  );
}
