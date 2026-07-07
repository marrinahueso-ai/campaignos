"use client";

import { CampaignCaptionsPage } from "@/components/event-workspace/captions/CampaignCaptionsPage";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { AiAssistantStatus } from "@/lib/ai";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignScheduleStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  metaSocialCaptionMilestones: MetaSocialCaptionMilestone[];
  aiStatus: AiAssistantStatus;
  initialExpandedDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  onNavigateToArtwork?: () => void;
}

export function CampaignScheduleStep({
  eventId,
  metaPublishBundles = [],
  metaSocialCaptionMilestones = [],
  aiStatus,
  initialExpandedDay = null,
  onFocusedMilestoneChange,
  onWorkflowStepSelect,
  onNavigateToArtwork,
}: CampaignScheduleStepProps) {
  return (
    <CampaignCaptionsPage
      eventId={eventId}
      milestones={metaSocialCaptionMilestones}
      metaPublishBundles={metaPublishBundles}
      aiStatus={aiStatus}
      initialRelativeDay={initialExpandedDay}
      onFocusedMilestoneChange={onFocusedMilestoneChange}
      onWorkflowStepSelect={onWorkflowStepSelect}
      onNavigateToArtwork={onNavigateToArtwork}
    />
  );
}
