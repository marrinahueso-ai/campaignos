"use client";

import { CampaignBriefingPanel } from "@/components/event-workspace/CampaignBriefingPanel";
import { CommunicationStrategyPanel } from "@/components/event-workspace/CommunicationStrategyPanel";
import { UpgradeToCampaignPanel } from "@/components/event-workspace/UpgradeToCampaignPanel";
import { EventAssetsSection } from "@/components/event-workspace/EventAssetsSection";
import { EventOverviewSection } from "@/components/event-workspace/EventOverviewSection";
import { EventWorkspaceHero } from "@/components/event-workspace/EventWorkspaceHero";
import { EventMemorySection } from "@/components/event-workspace/memory/EventMemorySection";
import { WorkspaceSection } from "@/components/event-workspace/WorkspaceSection";
import { OrganizationDefaultsPanel } from "@/components/organization-workspace/OrganizationDefaultsPanel";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { EventMemory } from "@/lib/memory";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventOrganizationDefaults } from "@/types/organization-workspace";
import type { EventAsset } from "@/types/event-workspace";
import type { Event } from "@/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface EventWorkspaceCalendarLayoutProps {
  event: Event;
  eventId: string;
  nextStep: EventNextStep;
  artwork: HeroArtworkSelection | null;
  campaignIntelligence: CampaignIntelligence;
  organizationDefaults: EventOrganizationDefaults | null;
  assets: EventAsset[];
  communicationStrategy: CommunicationStrategy;
  eventMemory: EventMemory;
}

export function EventWorkspaceCalendarLayout({
  event,
  eventId,
  nextStep,
  artwork,
  campaignIntelligence,
  organizationDefaults,
  assets,
  communicationStrategy,
  eventMemory,
}: EventWorkspaceCalendarLayoutProps) {
  return (
    <div className="space-y-6">
      <EventWorkspaceHero
        event={event}
        nextStep={nextStep}
        artwork={artwork}
        compact
      />

      <CampaignBriefingPanel intelligence={campaignIntelligence} />

      <div className="rounded-3xl bg-cos-card px-6 shadow-sm">
        <WorkspaceSection
          id="event-overview"
          title="Event Overview"
          description="Details and communication strategy."
        >
          <EventOverviewSection event={event} />
          <CommunicationStrategyPanel strategy={communicationStrategy} />
          <UpgradeToCampaignPanel eventId={eventId} />
          {organizationDefaults && (
            <OrganizationDefaultsPanel defaults={organizationDefaults} />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          id="event-assets"
          title="Event Assets"
          description="Artwork and files for this event."
        >
          <EventAssetsSection eventId={eventId} assets={assets} />
        </WorkspaceSection>
        <WorkspaceSection
          id="memory"
          title="Memory"
          description="Everything Hey Ralli remembers about this event."
        >
          <EventMemorySection memory={eventMemory} />
        </WorkspaceSection>
      </div>
    </div>
  );
}
