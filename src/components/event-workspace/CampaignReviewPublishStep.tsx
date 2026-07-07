"use client";

import { CampaignReviewPublishPage } from "@/components/event-workspace/review-publish/CampaignReviewPublishPage";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignReviewPublishStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  approvalRoleLabel?: string | null;
  initialExpandedDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  onNavigateToMilestone?: (step: CampaignWorkflowStep, relativeDay: number) => void;
  onViewPublished?: () => void;
}

export function CampaignReviewPublishStep({
  eventId,
  metaPublishBundles,
  approvalRoleLabel = null,
  initialExpandedDay = null,
  onFocusedMilestoneChange,
  onWorkflowStepSelect,
  onNavigateToMilestone,
  onViewPublished,
}: CampaignReviewPublishStepProps) {
  return (
    <CampaignReviewPublishPage
      eventId={eventId}
      metaPublishBundles={metaPublishBundles}
      approvalRoleLabel={approvalRoleLabel}
      initialExpandedDay={initialExpandedDay}
      onFocusedMilestoneChange={onFocusedMilestoneChange}
      onWorkflowStepSelect={onWorkflowStepSelect}
      onNavigateToMilestone={onNavigateToMilestone}
      onViewPublished={onViewPublished}
    />
  );
}
