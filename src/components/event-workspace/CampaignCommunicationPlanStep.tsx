"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { CHANNEL_LABELS, formatRelativeDay } from "@/lib/playbooks/constants";
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
  const [timingOpen, setTimingOpen] = useState(false);
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
            <button
              type="button"
              onClick={() => setTimingOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={timingOpen}
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-2">
                  {timingOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                  )}
                  <span className="text-sm font-medium text-cos-text">Timing</span>
                </span>
                <span className="text-sm text-cos-muted">{timing.presetName}</span>
              </span>
              {assignedSteps.length > 0 && (
                <span className="shrink-0 text-xs text-cos-muted">
                  {assignedSteps.length}{" "}
                  {assignedSteps.length === 1 ? "milestone" : "milestones"}
                </span>
              )}
            </button>

            {timingOpen && (
              <div className="mt-4 space-y-4">
                {assignedSteps.length > 0 ? (
                  <div className="rounded-xl border border-cos-border bg-cos-bg/40 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                      Scheduled for this event
                    </p>
                    <ul className="mt-3 space-y-2">
                      {assignedSteps.map((step) => (
                        <li
                          key={step.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-cos-text"
                        >
                          <span>{step.title}</span>
                          <span className="text-cos-muted">
                            {formatRelativeDay(step.relativeDay)} ·{" "}
                            {CHANNEL_LABELS[step.channel] ?? step.channel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-cos-muted">{timing.summary}</p>
                )}

                {showTimelineEditor && (
                  <CollapsiblePlaybookTimelineEditor
                    eventId={eventId}
                    steps={assignedSteps}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
