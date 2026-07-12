"use client";

import { PlanningHubDashboard } from "@/components/event-playbooks/planning-hub/PlanningHubDashboard";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { AiAssistantStatus } from "@/lib/ai";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventPlaybookHubData } from "@/types/event-playbooks";
import type { Event } from "@/types";

interface OverviewTabProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  artwork: HeroArtworkSelection | null;
  hasCampaign?: boolean;
  tablesAvailable?: boolean;
  metaPublishBundles?: MetaPublishBundle[];
  committeePersonOptions?: string[];
  defaultCommitteePerson?: string;
  greetingName: string;
  timezone?: string;
  campaignEvents: Event[];
  notificationCount: number;
  userEmail?: string | null;
  aiStatus: AiAssistantStatus;
  pastLessonCount: number;
  onNavigateTab: (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => void;
  eventVendorsData?: import("@/types/vendors").EventVendorsData;
  vendorDirectoryData?: {
    categories: import("@/types/vendors").VendorCategory[];
    events: Array<{ id: string; title: string; date: string }>;
    availableVendors: Array<{ id: string; name: string }>;
  };
}

export function OverviewTab({
  event,
  ownership,
  hubData,
  artwork,
  hasCampaign = true,
  tablesAvailable = true,
  metaPublishBundles = [],
  committeePersonOptions = [],
  defaultCommitteePerson = "",
  greetingName,
  campaignEvents,
  notificationCount,
  userEmail,
  aiStatus,
  pastLessonCount,
  onNavigateTab,
  eventVendorsData,
  vendorDirectoryData,
}: OverviewTabProps) {
  return (
    <PlanningHubDashboard
      event={event}
      ownership={ownership}
      hubData={hubData}
      artwork={artwork}
      hasCampaign={hasCampaign}
      metaPublishBundles={metaPublishBundles}
      committeePersonOptions={committeePersonOptions}
      defaultCommitteePerson={defaultCommitteePerson}
      greetingName={greetingName}
      campaignEvents={campaignEvents}
      notificationCount={notificationCount}
      userEmail={userEmail}
      aiStatus={aiStatus}
      pastLessonCount={pastLessonCount}
      tablesAvailable={tablesAvailable}
      onNavigateTab={onNavigateTab}
      eventVendorsData={eventVendorsData}
      vendorDirectoryData={vendorDirectoryData}
    />
  );
}
