"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  CampaignCommunicationPlanSettings,
  type ApprovalRoleOption,
} from "@/components/event-workspace/CampaignCommunicationPlanSettings";
import { CollapsiblePlaybookTimelineEditor } from "@/components/event-workspace/CollapsiblePlaybookTimelineEditor";
import { getTimingPlanSummary } from "@/lib/communications/communication-plan-display";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CampaignCommunicationPlanStepProps {
  eventId: string;
  communicationStrategy: CommunicationStrategy;
  eventType: EventType | null;
  approvalOrganizationRoleId: string | null;
  defaultApprovalRoleId: string | null;
  approvalRoles: ApprovalRoleOption[];
  ownership: EventRosterOwnership;
  assignedSteps: EventCommunicationStep[];
}

export function CampaignCommunicationPlanStep({
  eventId,
  communicationStrategy,
  eventType,
  approvalOrganizationRoleId,
  defaultApprovalRoleId,
  approvalRoles,
  ownership,
  assignedSteps,
}: CampaignCommunicationPlanStepProps) {
  const timing = getTimingPlanSummary({ eventType, communicationStrategy });

  const showTimelineEditor =
    assignedSteps.length > 0 &&
    (communicationStrategy === "full_campaign" ||
      communicationStrategy === "reminder_only");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Communication plan</CardTitle>
          <CardDescription>
            Event type, outreach level, who approves, and when posts go out.
          </CardDescription>
        </CardHeader>
        <div className="space-y-6 px-6 pb-6">
          <CampaignCommunicationPlanSettings
            eventId={eventId}
            eventType={eventType}
            communicationStrategy={communicationStrategy}
            approvalOrganizationRoleId={approvalOrganizationRoleId}
            defaultApprovalRoleId={defaultApprovalRoleId}
            approvalRoles={approvalRoles}
            ownership={ownership}
          />

          <div className="border-t border-cos-border pt-6">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-cos-text">Timing</span>
                <span className="text-sm text-cos-muted">{timing.presetName}</span>
              </span>
              {assignedSteps.length > 0 && (
                <span className="shrink-0 text-xs text-cos-muted">
                  {assignedSteps.length}{" "}
                  {assignedSteps.length === 1 ? "milestone" : "milestones"}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {assignedSteps.length === 0 && (
                <p className="text-sm text-cos-muted">{timing.summary}</p>
              )}

              {showTimelineEditor && (
                <CollapsiblePlaybookTimelineEditor
                  eventId={eventId}
                  steps={assignedSteps}
                />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
