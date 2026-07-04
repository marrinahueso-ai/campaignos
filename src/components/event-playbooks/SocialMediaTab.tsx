"use client";

import { useEffect, useState } from "react";
import { CampaignWorkspaceTabs } from "@/components/event-workspace/CampaignWorkspaceTabs";
import { CampaignCommunicationPlanStep } from "@/components/event-workspace/CampaignCommunicationPlanStep";
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
  ActivityLogEntry,
  StepCommunicationDraft,
} from "@/types/event-workspace";
import type { Event } from "@/types";
import type { EventPlaybookData } from "@/types/playbooks";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { resolveEventApprovalRoleLabel } from "@/lib/event-workspace/approval-role-display";
import type { EventCommunicationStep } from "@/types/playbooks";

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
  stepDrafts: StepCommunicationDraft[];
  metaSocialCaptionMilestones: MetaSocialCaptionMilestone[];
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  metaPublishBundles: MetaPublishBundle[];
  timeline: ActivityLogEntry[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  ownership: EventRosterOwnership;
  approvalRoles: ApprovalRoleOption[];
  defaultApprovalRoleId: string | null;
  initialStep?: CampaignWorkflowStep;
}

export function SocialMediaTab({
  event,
  eventId,
  organizationName = null,
  communicationStrategy,
  playbookData,
  metaSocialCaptionMilestones,
  assets,
  metaPublishBundles,
  timeline,
  aiStatus,
  userRole,
  ownership,
  approvalRoles,
  defaultApprovalRoleId,
  initialStep = "plan",
}: SocialMediaTabProps) {
  const [activeStep, setActiveStep] = useState<CampaignWorkflowStep>(initialStep);
  const [expandedCaptionDay, setExpandedCaptionDay] = useState<number | null>(null);
  const [expandedPublishDay, setExpandedPublishDay] = useState<number | null>(null);

  const approvalRoleLabel = resolveEventApprovalRoleLabel(
    event.approvalOrganizationRoleId,
    defaultApprovalRoleId,
    approvalRoles,
  );

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  function handleNavigateToCaptions(relativeDay: number) {
    const resolvedDay = resolveCaptionExpandedDay(
      relativeDay,
      metaSocialCaptionMilestones,
      playbookData.steps,
    );
    setExpandedCaptionDay(resolvedDay);
    setActiveStep("schedule");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  function handleNavigateToPublish(relativeDay: number) {
    setExpandedPublishDay(relativeDay);
    setActiveStep("publish");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
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
      setActiveStep("artwork");
      window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
      return;
    }
    if (step === "published") {
      setActiveStep("published");
      window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
    }
  }

  function handleViewPublished() {
    setActiveStep("published");
    window.requestAnimationFrame(scrollCampaignWorkflowIntoView);
  }

  return (
    <CampaignWorkspaceTabs
      activeStep={activeStep}
      onStepChange={setActiveStep}
      defaultStep={initialStep}
      manageHash={false}
      plan={
          <CampaignCommunicationPlanStep
            eventId={eventId}
            communicationStrategy={communicationStrategy}
            eventType={event.eventType}
            approvalOrganizationRoleId={event.approvalOrganizationRoleId}
            defaultApprovalRoleId={defaultApprovalRoleId}
            approvalRoles={approvalRoles}
            ownership={ownership}
            assignedSteps={playbookData.steps}
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
            onNavigateToCaptions={handleNavigateToCaptions}
          />
        }
        schedule={
          <CampaignScheduleStep
            eventId={eventId}
            metaPublishBundles={metaPublishBundles}
            metaSocialCaptionMilestones={metaSocialCaptionMilestones}
            aiStatus={aiStatus}
            userRole={userRole}
            initialExpandedDay={expandedCaptionDay}
            approvalRoleLabel={approvalRoleLabel}
            onNavigateToPublish={handleNavigateToPublish}
          />
        }
        publish={
          <CampaignReviewPublishStep
            eventId={eventId}
            event={event}
            metaPublishBundles={metaPublishBundles}
            approvalRoleLabel={approvalRoleLabel}
            initialExpandedDay={expandedPublishDay}
            onNavigateToMilestone={handleNavigateToMilestone}
            onViewPublished={handleViewPublished}
          />
        }
        published={
          <CampaignPublishedStep
            metaPublishBundles={metaPublishBundles}
            timeline={timeline}
          />
      }
    />
  );
}
