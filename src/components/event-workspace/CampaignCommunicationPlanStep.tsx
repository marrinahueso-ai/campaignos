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
import {
  getArtworkPlanLabels,
  getTimingPlanSummary,
} from "@/lib/communications/communication-plan-display";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { CHANNEL_LABELS, formatRelativeDay } from "@/lib/playbooks/constants";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CampaignCommunicationPlanStepProps {
  eventId: string;
  communicationStrategy: CommunicationStrategy;
  eventType: EventType | null;
  approvalOrganizationRoleId: string | null;
  defaultApprovalRoleId: string | null;
  approvalRoles: ApprovalRoleOption[];
  ownership: EventRosterOwnership;
  assets: EventAsset[];
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
  assets,
  assignedSteps,
}: CampaignCommunicationPlanStepProps) {
  const timing = getTimingPlanSummary({ eventType, communicationStrategy });
  const artworkLabels = getArtworkPlanLabels({
    eventType,
    communicationStrategy,
    assets,
  });

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
            <p className="text-sm font-medium text-cos-text">Timing</p>
            <p className="mt-1 text-sm text-cos-muted">
              {timing.presetName} — {timing.summary}
            </p>
            {timing.stepLabels.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {timing.stepLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-cos-border bg-cos-bg px-3 py-1 text-sm text-cos-text"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {assignedSteps.length > 0 && (
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
          )}

          {showTimelineEditor && (
            <CollapsiblePlaybookTimelineEditor
              eventId={eventId}
              steps={assignedSteps}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Artwork needed</CardTitle>
          <CardDescription>
            Create artwork once per milestone — we produce 1:1 feed and 9:16 story formats for
            Facebook and Instagram. Newsletters and email are handled in Captions.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          {artworkLabels.length === 0 ? (
            <p className="text-sm text-cos-muted">
              No artwork required for this communication plan.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {artworkLabels.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-cos-border bg-cos-bg px-3 py-1 text-sm text-cos-text"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
