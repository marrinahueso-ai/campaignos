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
    <aside className="hidden w-[200px] shrink-0 overflow-y-auto border-r border-cos-border bg-cos-bg-alt p-2.5 lg:block">
      <p className="mb-2 px-2 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
        Milestones
      </p>
      <ul className="space-y-1">
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
                  "flex w-full flex-col gap-0.5 rounded-[12px] px-2.5 py-2.5 text-left text-sm transition",
                  isSelected
                    ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                    : "text-cos-muted hover:bg-white/50 hover:text-cos-text",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      style.className,
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-3 w-3",
                        status === "generating" && "animate-spin",
                      )}
                      strokeWidth={2}
                    />
                  </span>
                  <strong className="truncate text-[13px] font-bold">
                    {milestone.name}
                  </strong>
                </span>
                <span className="pl-7 text-[11px] text-cos-muted">
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
