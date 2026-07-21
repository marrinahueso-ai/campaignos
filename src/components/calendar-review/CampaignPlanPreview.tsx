import { formatRelativeTimingLabel } from "@/lib/communications/communication-plan-display";
import { resolveTimingStepsForEvent } from "@/lib/playbooks/timing-presets";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

interface CampaignPlanPreviewProps {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  /** When set (e.g. org playbook step count), prefer over timing-preset summary. */
  planSummary?: string;
  compact?: boolean;
  className?: string;
}

export function CampaignPlanPreview({
  eventType,
  communicationStrategy,
  planSummary,
  compact = false,
  className = "",
}: CampaignPlanPreviewProps) {
  if (
    communicationStrategy === "calendar_only" ||
    communicationStrategy === "custom"
  ) {
    return (
      <p className={`text-xs text-cos-muted ${className}`.trim()}>
        {communicationStrategy === "calendar_only"
          ? "Calendar only — no posts scheduled"
          : "Custom plan — configure in the event workspace"}
      </p>
    );
  }

  if (planSummary) {
    return (
      <p className={`text-xs text-cos-muted ${className}`.trim()}>
        {planSummary}
      </p>
    );
  }

  const steps = resolveTimingStepsForEvent({
    eventType,
    communicationStrategy,
  });

  if (steps.length === 0) {
    return (
      <p className={`text-xs text-cos-muted ${className}`.trim()}>
        No communication milestones for this plan
      </p>
    );
  }

  if (compact) {
    return (
      <p className={`text-xs text-cos-muted ${className}`.trim()}>
        {steps.length} posts · {steps.map((step) => formatRelativeTimingLabel(step.relativeDay)).join(", ")}
      </p>
    );
  }

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {steps.map((step) => (
        <li
          key={`${step.relativeDay}-${step.title}`}
          className="rounded-full border border-cos-border bg-cos-bg px-2.5 py-0.5 text-xs text-cos-text"
        >
          {formatRelativeTimingLabel(step.relativeDay)}
        </li>
      ))}
    </ul>
  );
}
