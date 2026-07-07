"use client";

import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { CampaignCommunicationPlanStep } from "@/components/event-workspace/CampaignCommunicationPlanStep";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";

interface CampaignPlanPageProps {
  eventId: string;
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
  onWorkflowStepSelect,
  ...planProps
}: CampaignPlanPageProps) {
  return (
    <div className="overflow-hidden border border-cos-border bg-cos-card">
      <CaptionsProgressStepper
        activeStep="plan"
        onStepSelect={onWorkflowStepSelect}
      />

      <div className="p-5 lg:p-6">
        <CampaignCommunicationPlanStep {...planProps} />
      </div>
    </div>
  );
}
