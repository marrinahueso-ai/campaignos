"use client";

import { useCallback, useRef, useState } from "react";
import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { MilestonePlanningPageHeader } from "@/components/event-workspace/plan/MilestonePlanningPageHeader";
import { MilestonePlanningSection } from "@/components/event-workspace/plan/MilestonePlanningSection";
import { MILESTONE_PLANNING_COLORS } from "@/components/event-workspace/plan/milestone-planning-utils";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";

interface CampaignPlanPageProps {
  eventId: string;
  eventDate: string;
  communicationStrategy: CommunicationStrategy;
  eventType: EventType | null;
  approvalOrganizationRoleId: string | null;
  defaultApprovalRoleId: string | null;
  approvalRoles: ApprovalRoleOption[];
  ownership: EventRosterOwnership;
  assignedSteps: EventCommunicationStep[];
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
}

export function CampaignPlanPage({
  eventId,
  eventDate,
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
          eventId={eventId}
          onSavePlan={() => savePlanRef.current?.()}
          isSaving={isSaving}
        />
        <MilestonePlanningSection
          eventId={eventId}
          eventDate={eventDate}
          assignedSteps={assignedSteps}
          onSaveReady={handleSaveReady}
        />
      </div>
    </div>
  );
}
