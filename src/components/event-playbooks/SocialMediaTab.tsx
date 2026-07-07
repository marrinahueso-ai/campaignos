"use client";

import { useEffect, useState } from "react";
import { CampaignWorkspaceTabs, stepFromHash } from "@/components/event-workspace/CampaignWorkspaceTabs";
import { subscribeToLocationHash, setLocationHash } from "@/lib/navigation/location-hash";
import { CampaignPlanPage } from "@/components/event-workspace/plan/CampaignPlanPage";
import { CampaignCreativeTab } from "@/components/event-workspace/CampaignCreativeTab";
import { CampaignScheduleStep } from "@/components/event-workspace/CampaignScheduleStep";
import { CampaignReviewPublishStep } from "@/components/event-workspace/CampaignReviewPublishStep";
import { CampaignPublishedStep } from "@/components/event-workspace/CampaignPublishedStep";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { EventAssetVersion } from "@/types/event-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  EventAsset,
  StepCommunicationDraft,
} from "@/types/event-workspace";
import type { BrandAssets, Event } from "@/types";
import type { CommunicationPlaybook } from "@/types/playbooks";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { resolveEventApprovalRoleLabel } from "@/lib/event-workspace/approval-role-display";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { EventCommunicationStep, EventPlaybookData } from "@/types/playbooks";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventPlaybookTask } from "@/types/event-playbooks";

function resolveCaptionExpandedDay(
  relativeDay: number,
  milestones: MetaSocialCaptionMilestone[],
  communicationSteps: EventCommunicationStep[],
): number {
  if (milestones.some((milestone) => milestone.relativeDay === relativeDay)) {
    return relativeDay;
  }

  const stepTitle = communicationSteps.find((step) => step.relativeDay === relativeDay)?.title;
  if (stepTitle) {
    const byTitle = milestones.find((milestone) => milestone.title === stepTitle);
    if (byTitle) {
      return byTitle.relativeDay;
    }
  }

  return relativeDay;
}

function scrollCampaignWorkflowIntoView() {
  document
    .getElementById("campaign-workflow-tabs")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface SocialMediaTabProps {
  event: Event;
  eventId: string;
  organizationName?: string | null;
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
  initialStep?: CampaignWorkflowStep;
  onCampaignStepChange?: (step: CampaignWorkflowStep) => void;
  planningOverview?: EventPlanningOverviewData | null;
  artwork?: HeroArtworkSelection | null;
  tasks?: EventPlaybookTask[];
  backHref?: string;
  postingHeatmap?: PostingHeatmapData | null;
  brandAssets?: BrandAssets | null;
  campaignEvents?: Event[];
}

export function SocialMediaTab({
  event,
  eventId,
  organizationName = null,
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
  initialStep = "plan",
  onCampaignStepChange,
  planningOverview = null,
  artwork = null,
  tasks = [],
  backHref,
  postingHeatmap = null,
  brandAssets = null,
  campaignEvents = [],
}: SocialMediaTabProps) {
  const [activeStep, setActiveStep] = useState<CampaignWorkflowStep>(() => {
    if (typeof window === "undefined") {
      return initialStep;
    }

    return stepFromHash(window.location.hash) ?? initialStep;
  });
  const [focusedRelativeDay, setFocusedRelativeDay] = useState<number | null>(null);

  const approvalRoleLabel = resolveEventApprovalRoleLabel(
    event.approvalOrganizationRoleId,
    defaultApprovalRoleId,
    approvalRoles,
  );

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    function syncWorkflowStepFromHash() {
      const fromHash = stepFromHash(window.location.hash);
      if (fromHash) {
        setActiveStep(fromHash);
        onCampaignStepChange?.(fromHash);
      }
    }

    syncWorkflowStepFromHash();
    return subscribeToLocationHash(syncWorkflowStepFromHash);
  }, [onCampaignStepChange]);

  function navigateToWorkflowStep(step: CampaignWorkflowStep) {
    setActiveStep(step);
    onCampaignStepChange?.(step);
    setLocationHash(step);
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  function handleNavigateToCaptions(relativeDay: number) {
    const resolvedDay = resolveCaptionExpandedDay(
      relativeDay,
      metaSocialCaptionMilestones,
      playbookData.steps,
    );
    setFocusedRelativeDay(resolvedDay);
    navigateToWorkflowStep("schedule");
  }

  function handleNavigateToPublish(relativeDay: number) {
    setFocusedRelativeDay(relativeDay);
    navigateToWorkflowStep("publish");
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
      navigateToWorkflowStep("artwork");
      return;
    }
    if (step === "published") {
      navigateToWorkflowStep("published");
    }
  }

  function handleViewPublished() {
    navigateToWorkflowStep("published");
  }

  return (
    <CampaignWorkspaceTabs
      activeStep={activeStep}
      onStepChange={navigateToWorkflowStep}
      defaultStep={initialStep}
      manageHash={false}
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
            onWorkflowStepSelect={navigateToWorkflowStep}
            artwork={artwork}
            ownership={ownership}
            communicationStrategy={event.communicationStrategy}
            metaPublishBundles={metaPublishBundles}
            tasks={tasks}
            backHref={backHref}
            postingHeatmap={postingHeatmap}
            campaignEvents={campaignEvents}
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
            onWorkflowStepSelect={navigateToWorkflowStep}
            brandAssets={brandAssets}
            backHref={backHref}
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
            onWorkflowStepSelect={navigateToWorkflowStep}
            onNavigateToArtwork={() => navigateToWorkflowStep("artwork")}
            onNavigateToPublish={handleNavigateToPublish}
            backHref={backHref}
          />
        }
        publish={
          <CampaignReviewPublishStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            approvalRoleLabel={approvalRoleLabel}
            initialExpandedDay={focusedRelativeDay}
            onFocusedMilestoneChange={handleFocusedMilestoneChange}
            onWorkflowStepSelect={navigateToWorkflowStep}
            onNavigateToMilestone={handleNavigateToMilestone}
            onViewPublished={handleViewPublished}
            backHref={backHref}
          />
        }
        published={
          <CampaignPublishedStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            planningOverview={planningOverview}
            onWorkflowStepSelect={navigateToWorkflowStep}
            backHref={backHref}
          />
        }
    />
  );
}
