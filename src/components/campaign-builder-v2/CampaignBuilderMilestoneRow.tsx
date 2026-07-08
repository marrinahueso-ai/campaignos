"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignBuilderMilestone,
  MilestoneCategory,
  MilestoneStatusTag,
} from "@/lib/campaign-builder-v2/types";

const ROW_GRID =
  "grid items-center gap-x-4 gap-y-2 px-4 py-4 sm:grid-cols-[2rem_2rem_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_7rem]";

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  awareness: "Awareness",
  reminder: "Reminder",
  "event-day": "Event day",
  recap: "Recap",
};

const STATUS_TAG_STYLES: Record<MilestoneStatusTag, string> = {
  complete: "bg-cos-success-bg text-cos-success-text",
  "in-progress": "bg-cos-info text-cos-info-text",
  "needs-review": "bg-cos-warning text-cos-warning-text",
  pending: "bg-cos-accent-soft text-cos-text",
  "not-started": "bg-cos-bg text-cos-muted border border-cos-border",
};

function PlatformIcons() {
  return (
    <span className="flex items-center gap-1.5" aria-label="Facebook and Instagram">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-bold text-white">
        f
      </span>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-[10px] font-bold text-white">
        ig
      </span>
    </span>
  );
}

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
  index: number;
  menuOpenId: string | null;
  onEdit: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignBuilderMilestoneRow({
  milestone,
  index,
  menuOpenId,
  onEdit,
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
            STATUS_TAG_STYLES[milestone.statusTag],
          )}
        >
          {milestone.statusTag.replace("-", " ")}
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
        <PlatformIcons />
      </div>

      <div className="relative flex items-center gap-1 self-start">
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
