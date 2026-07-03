import { CommunicationTimelineSection } from "@/components/playbooks/CommunicationTimelineSection";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { StepCommunicationDraft } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

interface TimelineTabProps {
  eventId: string;
  steps: EventCommunicationStep[];
  stepDrafts: StepCommunicationDraft[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  hasPlaybook: boolean;
}

export function TimelineTab({
  eventId,
  steps,
  stepDrafts,
  aiStatus,
  userRole,
  hasPlaybook,
}: TimelineTabProps) {
  if (!hasPlaybook || steps.length === 0) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Communication timeline</CardTitle>
          <CardDescription>
            No communication playbook assigned. Set this event to a full campaign or
            reminders-only plan to generate a timeline.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cos-muted">
        This timeline mirrors your communication playbook — posts, reminders, and
        channel deadlines for this event.
      </p>
      <CommunicationTimelineSection
        eventId={eventId}
        steps={steps}
        stepDrafts={stepDrafts}
        aiStatus={aiStatus}
        userRole={userRole}
      />
    </div>
  );
}
