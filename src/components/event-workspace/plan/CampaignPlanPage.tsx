"use client";

import { useCallback, useRef } from "react";
import { SocialMediaCenterShell } from "@/components/event-workspace/plan/SocialMediaCenterShell";
import { MilestonePlanningSection } from "@/components/event-workspace/plan/MilestonePlanningSection";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { Event } from "@/types";
import type { CommunicationPlaybook, EventCommunicationStep } from "@/types/playbooks";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CampaignPlanPageProps {
  event: Event;
  eventDate: string;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
  assignedSteps: EventCommunicationStep[];
  postingHeatmap?: PostingHeatmapData | null;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  artwork?: HeroArtworkSelection | null;
  ownership?: EventRosterOwnership | null;
  communicationStrategy?: CommunicationStrategy;
  metaPublishBundles?: MetaPublishBundle[];
  tasks?: EventPlaybookTask[];
  backHref?: string;
  campaignEvents?: Event[];
}

export function CampaignPlanPage({
  event,
  eventDate,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
  assignedSteps,
  postingHeatmap = null,
  onWorkflowStepSelect,
  artwork = null,
  ownership = null,
  communicationStrategy,
  metaPublishBundles = [],
  tasks = [],
  backHref,
  campaignEvents = [],
}: CampaignPlanPageProps) {
  const addMilestoneRef = useRef<(() => void) | null>(null);

  const handleAddMilestoneReady = useCallback((addMilestone: () => void) => {
    addMilestoneRef.current = addMilestone;
  }, []);

  return (
    <SocialMediaCenterShell
      event={event}
      artwork={artwork}
      ownership={ownership}
      communicationStrategy={communicationStrategy}
      activeStep="plan"
      onStepSelect={onWorkflowStepSelect}
      metaPublishBundles={metaPublishBundles}
      tasks={tasks}
      onCreateMilestone={() => addMilestoneRef.current?.()}
      backHref={backHref}
      campaignEvents={campaignEvents}
    >
      <MilestonePlanningSection
        event={event}
        eventId={event.id}
        eventDate={eventDate}
        assignedSteps={assignedSteps}
        metaPublishBundles={metaPublishBundles}
        postingHeatmap={postingHeatmap}
        playbookId={playbookId}
        availablePlaybooks={availablePlaybooks}
        vpRoles={vpRoles}
        defaultVpRoleId={defaultVpRoleId}
        committeePersonOptions={committeePersonOptions}
        defaultCommitteePerson={defaultCommitteePerson}
        onAddMilestoneReady={handleAddMilestoneReady}
      />
    </SocialMediaCenterShell>
  );
}
