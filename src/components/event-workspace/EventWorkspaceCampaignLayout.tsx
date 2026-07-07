"use client";

import { useState } from "react";
import { CampaignWorkspaceTabs } from "@/components/event-workspace/CampaignWorkspaceTabs";
import { CampaignPlanPage } from "@/components/event-workspace/plan/CampaignPlanPage";
import { CampaignCreativeTab } from "@/components/event-workspace/CampaignCreativeTab";
import { CampaignScheduleStep } from "@/components/event-workspace/CampaignScheduleStep";
import { CampaignReviewPublishStep } from "@/components/event-workspace/CampaignReviewPublishStep";
import { CampaignPublishedStep } from "@/components/event-workspace/CampaignPublishedStep";
import { EventWorkspaceHero } from "@/components/event-workspace/EventWorkspaceHero";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { EventAssetVersion } from "@/types/event-workspace";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  EventAsset,
  StepCommunicationDraft,
} from "@/types/event-workspace";
import type { Event } from "@/types";
import type { CommunicationPlaybook, EventPlaybookData } from "@/types/playbooks";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { resolveEventApprovalRoleLabel } from "@/lib/event-workspace/approval-role-display";
import { setLocationHash } from "@/lib/navigation/location-hash";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";

function scrollCampaignWorkflowIntoView() {
  document
    .getElementById("campaign-workflow-tabs")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface EventWorkspaceCampaignLayoutProps {
  event: Event;
  eventId: string;
  organizationName?: string | null;
  nextStep: EventNextStep;
  artwork: HeroArtworkSelection | null;
  campaignProgress: CampaignProgressSnapshot;
  communicationStrategy: CommunicationStrategy;
  playbookData: EventPlaybookData;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
  stepDrafts: StepCommunicationDraft[];
  metaSocialCaptionMilestones: MetaSocialCaptionMilestone[];
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  metaPublishBundles: MetaPublishBundle[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  ownership: EventRosterOwnership;
  approvalRoles: ApprovalRoleOption[];
  defaultApprovalRoleId: string | null;
  showRoleSimulator?: boolean;
  eventDetailsChanged?: boolean;
}

export function EventWorkspaceCampaignLayout({
  event,
  eventId,
  organizationName = null,
  nextStep,
  artwork,
  campaignProgress,
  communicationStrategy,
  playbookData,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
  metaSocialCaptionMilestones,
  assets,
  metaPublishBundles,
  aiStatus,
  userRole,
  ownership,
  approvalRoles,
  defaultApprovalRoleId,
}: EventWorkspaceCampaignLayoutProps) {
  const [focusedRelativeDay, setFocusedRelativeDay] = useState<number | null>(null);

  const approvalRoleLabel = resolveEventApprovalRoleLabel(
    event.approvalOrganizationRoleId,
    defaultApprovalRoleId,
    approvalRoles,
  );

  function handleNavigateToCaptions(relativeDay: number) {
    const stepTitle = playbookData.steps.find((step) => step.relativeDay === relativeDay)?.title;
    const resolvedDay =
      metaSocialCaptionMilestones.find((milestone) => milestone.relativeDay === relativeDay)
        ?.relativeDay ??
      (stepTitle
        ? metaSocialCaptionMilestones.find((milestone) => milestone.title === stepTitle)
            ?.relativeDay
        : undefined) ??
      relativeDay;

    setFocusedRelativeDay(resolvedDay);
    setLocationHash("schedule");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  function handleNavigateToPublish(relativeDay: number) {
    setFocusedRelativeDay(relativeDay);
    setLocationHash("publish");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  function handleFocusedMilestoneChange(relativeDay: number) {
    setFocusedRelativeDay(relativeDay);
  }

  function handleNavigateToMilestone(step: CampaignWorkflowStep, relativeDay: number) {
    if (step === "schedule") {
      handleNavigateToCaptions(relativeDay);
      return;
    }
    if (step === "publish") {
      handleNavigateToPublish(relativeDay);
      return;
    }
    if (step === "artwork") {
      setFocusedRelativeDay(relativeDay);
      setLocationHash("artwork");
      window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
      return;
    }
    if (step === "published") {
      setLocationHash("published");
      window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
    }
  }

  function handleViewPublished() {
    setLocationHash("published");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  return (
    <div className="space-y-6">
      <EventWorkspaceHero
        event={event}
        nextStep={nextStep}
        artwork={artwork}
        compact
        campaignProgress={campaignProgress}
      />

      <CampaignWorkspaceTabs
        defaultStep="plan"
        fullBleedSteps={["plan", "artwork", "schedule", "publish", "published"]}
        plan={
          <CampaignPlanPage
            event={event}
            eventDate={event.date}
            playbookId={playbookData.playbook.id}
            availablePlaybooks={availablePlaybooks}
            vpRoles={vpRoles}
            defaultVpRoleId={defaultVpRoleId}
            committeePersonOptions={committeePersonOptions}
            defaultCommitteePerson={defaultCommitteePerson}
            assignedSteps={playbookData.steps}
            metaPublishBundles={metaPublishBundles}
            artwork={artwork}
            ownership={ownership}
            communicationStrategy={communicationStrategy}
            onWorkflowStepSelect={(step) => {
              setLocationHash(step);
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
          />
        }
        artwork={
          <CampaignCreativeTab
            eventId={eventId}
            event={event}
            organizationName={organizationName}
            eventType={event.eventType}
            communicationStrategy={communicationStrategy}
            communicationSteps={playbookData.steps}
            assets={assets}
            metaPublishBundles={metaPublishBundles}
            initialRelativeDay={focusedRelativeDay}
            onFocusedMilestoneChange={handleFocusedMilestoneChange}
            onNavigateToCaptions={handleNavigateToCaptions}
            onWorkflowStepSelect={(step) => {
              setLocationHash(step);
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
          />
        }
        schedule={
          <CampaignScheduleStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            metaSocialCaptionMilestones={metaSocialCaptionMilestones}
            aiStatus={aiStatus}
            initialExpandedDay={focusedRelativeDay}
            onFocusedMilestoneChange={handleFocusedMilestoneChange}
            onWorkflowStepSelect={(step) => {
              setLocationHash(step);
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
            onNavigateToArtwork={() => {
              setLocationHash("artwork");
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
            onNavigateToPublish={handleNavigateToPublish}
          />
        }
        publish={
          <CampaignReviewPublishStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            approvalRoleLabel={approvalRoleLabel}
            initialExpandedDay={focusedRelativeDay}
            onFocusedMilestoneChange={handleFocusedMilestoneChange}
            onWorkflowStepSelect={(step) => {
              setLocationHash(step);
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
            onNavigateToMilestone={handleNavigateToMilestone}
            onViewPublished={handleViewPublished}
          />
        }
        published={
          <CampaignPublishedStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            onWorkflowStepSelect={(step) => {
              setLocationHash(step);
              window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
            }}
          />
        }
      />
    </div>
  );
}
