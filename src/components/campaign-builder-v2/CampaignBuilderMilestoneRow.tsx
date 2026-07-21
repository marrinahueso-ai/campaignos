"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Sparkles,
} from "lucide-react";
import { MetaPlatformBadges } from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { cn } from "@/lib/utils/cn";
import {
  MILESTONE_STATUS_LABELS,
  resolveMilestoneGenerationStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import type {
  CampaignBuilderMilestone,
  MilestoneCategory,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

const ROW_GRID =
  "grid items-center gap-x-4 gap-y-2 px-4 py-4 sm:grid-cols-[2rem_2rem_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_7rem]";

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  awareness: "Awareness",
  reminder: "Reminder",
  "event-day": "Event day",
  recap: "Recap",
};

const STATUS_STYLES: Record<MilestoneGenerationStatus, string> = {
  ready_to_generate: "bg-cos-bg text-cos-muted border border-cos-border",
  queued: "bg-cos-info text-cos-info-text",
  generating: "bg-cos-info text-cos-info-text",
  generated: "bg-cos-success-bg text-cos-success-text",
  needs_review: "bg-cos-warning text-cos-warning-text",
  changes_requested: "bg-cos-warning text-cos-warning-text",
  awaiting_approval: "bg-cos-accent-soft text-cos-text",
  approved: "bg-cos-success-bg text-cos-success-text",
  scheduled: "bg-cos-success-bg text-cos-success-text",
  published: "bg-cos-success-bg text-cos-success-text",
  failed: "bg-cos-warning/20 text-cos-warning-text border border-cos-warning/40",
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface CampaignBuilderMilestoneRowProps {
  milestone: CampaignBuilderMilestone;
  preview?: MilestonePreviewContent | null;
  index: number;
  menuOpenId: string | null;
  isGenerating?: boolean;
  onEdit: (id: string) => void;
  onGenerate?: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignBuilderMilestoneRow({
  milestone,
  preview = null,
  index,
  menuOpenId,
  isGenerating = false,
  onEdit,
  onGenerate,
  onToggleMenu,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: CampaignBuilderMilestoneRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status: MilestoneGenerationStatus = isGenerating
    ? "generating"
    : resolveMilestoneGenerationStatus(preview, milestone.platformFormats);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        ROW_GRID,
        "border-b border-cos-border transition-colors last:border-b-0",
        isDragging && "z-10 opacity-40",
        isOver && !isDragging && "bg-cos-accent-soft/40",
      )}
    >
      <button
        type="button"
        aria-label={`Drag ${milestone.name}`}
        className="cursor-grab self-start p-1 text-cos-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <span className="self-start text-sm text-cos-muted">{index + 1}</span>

      <div className="min-w-0 space-y-1.5 self-start">
        <p className="font-medium text-cos-text">{milestone.name}</p>
        <span
          className={cn(
            "inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            STATUS_STYLES[status],
          )}
        >
          {MILESTONE_STATUS_LABELS[status]}
        </span>
        <span
          className={cn(
            "ml-1 inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            "bg-cos-accent-soft text-cos-text",
          )}
        >
          {CATEGORY_LABELS[milestone.category]}
        </span>
      </div>

      <p className="min-w-0 self-start text-sm text-cos-muted">{milestone.purpose}</p>

      <span className="self-start whitespace-nowrap text-sm text-cos-text">
        {formatDate(milestone.suggestedDate)}
      </span>

      <div className="self-start">
        <MetaPlatformBadges size="md" />
      </div>

      <div className="relative flex items-center gap-1 self-start">
        {onGenerate && (
          <button
            type="button"
            aria-label={`Generate content for ${milestone.name}`}
            className="p-1.5 text-cos-accent transition-colors hover:text-cos-text disabled:opacity-50"
            disabled={isGenerating}
            onClick={() => onGenerate(milestone.id)}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        )}
        <button
          type="button"
          aria-label={`Edit ${milestone.name}`}
          className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
          onClick={() => onEdit(milestone.id)}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label={`More actions for ${milestone.name}`}
          className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
          onClick={() => onToggleMenu(milestone.id)}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </button>
        {menuOpenId === milestone.id && (
          <div className="absolute right-0 top-8 z-20 min-w-[10rem] border border-cos-border bg-cos-card py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-cos-bg"
              onClick={() => onDuplicate(milestone.id)}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-cos-bg"
              onClick={() => onMoveUp(milestone.id)}
            >
              Move up
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-cos-bg"
              onClick={() => onMoveDown(milestone.id)}
            >
              Move down
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-cos-bg"
              onClick={() => onDelete(milestone.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
