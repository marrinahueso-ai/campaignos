"use client";

import { useState } from "react";
import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import { SocialMediaTab } from "@/components/event-playbooks/SocialMediaTab";
import { CalendarOnlySettingsExtras } from "@/components/event-playbooks/CalendarOnlySettingsExtras";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { EventMemory } from "@/lib/memory";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventOrganizationDefaults } from "@/types/organization-workspace";
import type {
  EventAsset,
  ActivityLogEntry,
  StepCommunicationDraft,
  EventAssetVersion,
} from "@/types/event-workspace";
import type { Event } from "@/types";
import type { EventPlaybookData } from "@/types/playbooks";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { EventPlaybookHubData } from "@/types/event-playbooks";

interface CampaignWorkspaceBundle {
  organizationName: string | null;
  nextStep: EventNextStep;
  artwork: HeroArtworkSelection | null;
  campaignProgress: CampaignProgressSnapshot;
  playbookData: EventPlaybookData;
  stepDrafts: StepCommunicationDraft[];
  metaSocialCaptionMilestones: MetaSocialCaptionMilestone[];
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  metaPublishBundles: MetaPublishBundle[];
  timeline: ActivityLogEntry[];
  approvalRoles: ApprovalRoleOption[];
  defaultApprovalRoleId: string | null;
  eventDetailsChanged?: boolean;
}

interface CalendarContextBundle {
  nextStep: EventNextStep;
  artwork: HeroArtworkSelection | null;
  campaignIntelligence: CampaignIntelligence;
  organizationDefaults: EventOrganizationDefaults | null;
  assets: EventAsset[];
  eventMemory: EventMemory;
}

interface EventPlanningHubProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  pastEvents: Event[];
  pastLessonCount: number;
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  tablesAvailable: boolean;
  taskGroupsAvailable?: boolean;
  hasCampaign: boolean;
  campaignWorkspace?: CampaignWorkspaceBundle;
  calendarContext?: CalendarContextBundle;
}

export function EventPlanningHub({
  event,
  ownership,
  hubData,
  pastEvents,
  pastLessonCount,
  aiStatus,
  userRole,
  tablesAvailable,
  taskGroupsAvailable = true,
  hasCampaign,
  campaignWorkspace,
  calendarContext,
}: EventPlanningHubProps) {
  const [campaignStep, setCampaignStep] = useState<CampaignWorkflowStep>("plan");

  const socialMedia =
    hasCampaign && campaignWorkspace ? (
      <SocialMediaTab
        event={event}
        eventId={event.id}
        organizationName={campaignWorkspace.organizationName}
        communicationStrategy={event.communicationStrategy}
        playbookData={campaignWorkspace.playbookData}
        stepDrafts={campaignWorkspace.stepDrafts}
        metaSocialCaptionMilestones={campaignWorkspace.metaSocialCaptionMilestones}
        assets={campaignWorkspace.assets}
        assetVersions={campaignWorkspace.assetVersions}
        metaPublishBundles={campaignWorkspace.metaPublishBundles}
        timeline={campaignWorkspace.timeline}
        aiStatus={aiStatus}
        userRole={userRole}
        ownership={ownership ?? {
          committeeName: null,
          chairNames: [],
          vpRoleName: null,
          vpContactName: null,
          committeeFilled: false,
          vpFilled: false,
        }}
        approvalRoles={campaignWorkspace.approvalRoles}
        defaultApprovalRoleId={campaignWorkspace.defaultApprovalRoleId}
        initialStep={campaignStep}
        onCampaignStepChange={setCampaignStep}
      />
    ) : null;

  const calendarSettingsExtras =
    !hasCampaign && calendarContext ? (
      <CalendarOnlySettingsExtras
        event={event}
        eventId={event.id}
        nextStep={calendarContext.nextStep}
        artwork={calendarContext.artwork}
        campaignIntelligence={calendarContext.campaignIntelligence}
        organizationDefaults={calendarContext.organizationDefaults}
        assets={calendarContext.assets}
        communicationStrategy={event.communicationStrategy}
        eventMemory={calendarContext.eventMemory}
      />
    ) : undefined;

  const heroArtwork =
    campaignWorkspace?.artwork ?? calendarContext?.artwork ?? null;

  return (
    <EventPlaybookHubShell
      event={event}
      artwork={heroArtwork}
      ownership={ownership}
      hubData={hubData}
      pastEvents={pastEvents}
      pastLessonCount={pastLessonCount}
      aiStatus={aiStatus}
      tablesAvailable={tablesAvailable}
      taskGroupsAvailable={taskGroupsAvailable}
      hasCampaign={hasCampaign}
      socialMedia={socialMedia}
      calendarSettingsExtras={calendarSettingsExtras}
      initialCampaignStep={campaignStep}
      onCampaignStepChange={setCampaignStep}
    />
  );
}
