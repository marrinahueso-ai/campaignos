"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

function formatScheduledWhen(isoOrEmpty: string | null | undefined): string {
  if (!isoOrEmpty) {
    return "";
  }
  return formatDateTime(isoOrEmpty).replace(/,([^,]*)$/, " at$1");
}

interface MilestoneOption {
  relativeDay: number;
  title: string;
}

interface CaptionsMilestoneBarProps {
  milestones: MilestoneOption[];
  selectedRelativeDay: number;
  onSelectMilestone: (relativeDay: number) => void;
  scheduledFor: string | null;
  statusLabel?: string;
}

export function CaptionsMilestoneBar({
  milestones,
  selectedRelativeDay,
  onSelectMilestone,
  scheduledFor,
  statusLabel = "Scheduled",
}: CaptionsMilestoneBarProps) {
  const selected = milestones.find((m) => m.relativeDay === selectedRelativeDay);
  const whenLabel = formatScheduledWhen(scheduledFor);

  return (
    <div className="flex flex-col gap-3 border-b border-cos-border bg-cos-bg/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm font-medium text-cos-text">Milestone</span>
        <div className="relative min-w-0 max-w-md flex-1">
          <CalendarDays
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <select
            value={selectedRelativeDay}
            onChange={(event) => onSelectMilestone(Number(event.target.value))}
            className="h-10 w-full appearance-none rounded-sm border border-cos-border bg-cos-card pr-10 pl-10 text-sm text-cos-text focus:border-cos-dark focus:outline-none"
            aria-label="Select milestone"
          >
            {milestones.map((milestone) => (
              <option key={milestone.relativeDay} value={milestone.relativeDay}>
                {milestone.title}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            "bg-cos-success-bg text-cos-success-text",
          )}
        >
          {statusLabel}
        </span>
        {whenLabel && <span className="text-sm text-cos-muted">{whenLabel}</span>}
        {!whenLabel && selected && (
          <span className="text-sm text-cos-muted">{selected.title}</span>
        )}
      </div>
    </div>
  );
}
