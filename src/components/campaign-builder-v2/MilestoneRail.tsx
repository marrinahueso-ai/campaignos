"use client";

import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  MILESTONE_STATUS_LABELS,
  resolveMilestoneGenerationStatus,
  sortedMilestones,
} from "@/lib/campaign-builder-v2/milestone-status";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignBuilderMilestone,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

interface MilestoneRailProps {
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
  selectedMilestoneId: string | null;
  generatingMilestoneId: string | null;
  onSelect: (milestoneId: string) => void;
}

const STATUS_STYLES: Record<
  MilestoneGenerationStatus,
  { icon: typeof Check; className: string }
> = {
  ready_to_generate: {
    icon: Sparkles,
    className: "bg-cos-bg text-cos-muted border border-cos-border",
  },
  queued: {
    icon: Clock,
    className: "bg-cos-bg text-cos-muted border border-cos-border",
  },
  generating: {
    icon: Loader2,
    className: "bg-cos-accent-soft text-cos-text border border-cos-border",
  },
  generated: {
    icon: Check,
    className: "bg-cos-success text-white",
  },
  needs_review: {
    icon: Clock,
    className: "bg-cos-warning text-cos-warning-text",
  },
  changes_requested: {
    icon: AlertCircle,
    className: "bg-cos-warning text-cos-warning-text",
  },
  awaiting_approval: {
    icon: Clock,
    className: "bg-cos-warning/80 text-cos-warning-text",
  },
  approved: {
    icon: Check,
    className: "bg-cos-success text-white",
  },
  scheduled: {
    icon: Check,
    className: "bg-cos-success/80 text-white",
  },
  published: {
    icon: Check,
    className: "bg-cos-success text-white",
  },
  failed: {
    icon: AlertCircle,
    className: "bg-cos-warning/20 text-cos-warning-text border border-cos-warning/40",
  },
};

export function MilestoneRail({
  milestones,
  previewContents,
  selectedMilestoneId,
  generatingMilestoneId,
  onSelect,
}: MilestoneRailProps) {
  const previewById = new Map(
    previewContents.map((content) => [content.milestoneId, content]),
  );

  return (
    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-cos-border bg-cos-card lg:block">
      <ul className="divide-y divide-cos-border">
        {sortedMilestones(milestones).map((milestone) => {
          const preview = previewById.get(milestone.id);
          const isGenerating =
            generatingMilestoneId === milestone.id ||
            preview?.generationStatus === "generating";
          const status: MilestoneGenerationStatus = isGenerating
            ? "generating"
            : resolveMilestoneGenerationStatus(
                preview,
                milestone.platformFormats,
              );
          const style = STATUS_STYLES[status];
          const StatusIcon = style.icon;
          const isSelected = milestone.id === selectedMilestoneId;

          return (
            <li key={milestone.id}>
              <button
                type="button"
                onClick={() => onSelect(milestone.id)}
                className={cn(
                  "flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-cos-accent-soft/60 text-cos-text"
                    : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      style.className,
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        status === "generating" && "animate-spin",
                      )}
                      strokeWidth={2}
                    />
                  </span>
                  <span className="truncate font-medium">{milestone.name}</span>
                </div>
                <span className="pl-9 text-[11px] text-cos-muted">
                  {MILESTONE_STATUS_LABELS[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
