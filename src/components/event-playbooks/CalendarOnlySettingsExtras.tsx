"use client";

import { CampaignBriefingPanel } from "@/components/event-workspace/CampaignBriefingPanel";
import { CommunicationStrategyPanel } from "@/components/event-workspace/CommunicationStrategyPanel";
import { UpgradeToCampaignPanel } from "@/components/event-workspace/UpgradeToCampaignPanel";
import { EventAssetsSection } from "@/components/event-workspace/EventAssetsSection";
import { EventOverviewSection } from "@/components/event-workspace/EventOverviewSection";
import { EventMemorySection } from "@/components/event-workspace/memory/EventMemorySection";
import { OrganizationDefaultsPanel } from "@/components/organization-workspace/OrganizationDefaultsPanel";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { EventMemory } from "@/lib/memory";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventOrganizationDefaults } from "@/types/organization-workspace";
import type { EventAsset } from "@/types/event-workspace";
import type { Event } from "@/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CalendarOnlySettingsExtrasProps {
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

export function CalendarOnlySettingsExtras({
  event,
  eventId,
  campaignIntelligence,
  organizationDefaults,
  assets,
  communicationStrategy,
  eventMemory,
}: CalendarOnlySettingsExtrasProps) {
  return (
    <div className="space-y-6 border-t border-cos-border pt-6">
      <CampaignBriefingPanel intelligence={campaignIntelligence} />
      <EventOverviewSection event={event} />
      <CommunicationStrategyPanel strategy={communicationStrategy} />
      <UpgradeToCampaignPanel eventId={eventId} />
      {organizationDefaults && (
        <OrganizationDefaultsPanel defaults={organizationDefaults} />
      )}
      <EventAssetsSection eventId={eventId} assets={assets} />
      <EventMemorySection memory={eventMemory} />
    </div>
  );
}
