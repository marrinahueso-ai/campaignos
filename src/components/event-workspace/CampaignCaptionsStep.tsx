import { CommunicationTimelineSection } from "@/components/playbooks/CommunicationTimelineSection";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { StepCommunicationDraft } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CampaignCaptionsStepProps {
  eventId: string;
  steps: EventCommunicationStep[];
  stepDrafts: StepCommunicationDraft[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  showRoleSimulator?: boolean;
  eventDetailsChanged?: boolean;
}

export function CampaignCaptionsStep({
  eventId,
  steps,
  stepDrafts,
  aiStatus,
  userRole,
  showRoleSimulator = false,
  eventDetailsChanged = false,
}: CampaignCaptionsStepProps) {
  return (
    <div className="space-y-6">
      <CommunicationTimelineSection
        eventId={eventId}
        steps={steps}
        stepDrafts={stepDrafts}
        aiStatus={aiStatus}
        userRole={userRole}
        showRoleSimulator={showRoleSimulator}
        eventDetailsChanged={eventDetailsChanged}
      />
    </div>
  );
}
