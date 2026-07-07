"use client";

import { useCallback, useRef, useState } from "react";
import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { MilestonePlanningPageHeader } from "@/components/event-workspace/plan/MilestonePlanningPageHeader";
import { MilestonePlanningSection } from "@/components/event-workspace/plan/MilestonePlanningSection";
import { MILESTONE_PLANNING_COLORS } from "@/components/event-workspace/plan/milestone-planning-utils";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { Event } from "@/types";
import type { CommunicationPlaybook, EventCommunicationStep } from "@/types/playbooks";

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
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
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
  onWorkflowStepSelect,
}: CampaignPlanPageProps) {
  const savePlanRef = useRef<(() => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveReady = useCallback((save: () => void, state: { isPending: boolean }) => {
    savePlanRef.current = save;
    setIsSaving((current) => (current === state.isPending ? current : state.isPending));
  }, []);

  return (
    <div
      className="overflow-hidden border"
      style={{
        borderColor: MILESTONE_PLANNING_COLORS.border,
        backgroundColor: MILESTONE_PLANNING_COLORS.pageBg,
      }}
    >
      <CaptionsProgressStepper
        activeStep="plan"
        onStepSelect={onWorkflowStepSelect}
      />

      <div className="p-5 lg:p-6">
        <MilestonePlanningPageHeader
          eventId={event.id}
          event={event}
          playbookId={playbookId}
          availablePlaybooks={availablePlaybooks}
          vpRoles={vpRoles}
          defaultVpRoleId={defaultVpRoleId}
          committeePersonOptions={committeePersonOptions}
          defaultCommitteePerson={defaultCommitteePerson}
          onSavePlan={() => savePlanRef.current?.()}
          isSaving={isSaving}
        />
        <MilestonePlanningSection
          eventId={event.id}
          eventDate={eventDate}
          assignedSteps={assignedSteps}
          onSaveReady={handleSaveReady}
        />
      </div>
    </div>
  );
}
