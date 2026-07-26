"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Sparkles,
} from "lucide-react";
import { MetaPlatformBadges } from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { Button } from "@/components/ui/Button";
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
  generated: "bg-[rgba(107,129,113,0.15)] text-[#2f4a3c]",
  needs_review: "bg-[rgba(212,168,75,0.18)] text-[#7a5a12]",
  changes_requested: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
  awaiting_approval: "bg-cos-accent-soft text-cos-text",
  approved: "bg-[rgba(107,129,113,0.15)] text-[#2f4a3c]",
  scheduled: "bg-[rgba(107,129,113,0.15)] text-[#2f4a3c]",
  published: "bg-[rgba(107,129,113,0.15)] text-[#2f4a3c]",
  failed: "bg-cos-warning/20 text-cos-warning-text border border-cos-warning/40",
};

function formatDateParts(dateStr: string): { mo: string; dy: string } {
  try {
    const date = new Date(`${dateStr}T12:00:00`);
    return {
      mo: date.toLocaleDateString("en-US", { month: "short" }),
      dy: String(date.getDate()),
    };
  } catch {
    return { mo: "—", dy: "—" };
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
  const [open, setOpen] = useState(false);
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
  const { mo, dy } = formatDateParts(milestone.suggestedDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-[16px] border border-cos-border bg-cos-bg transition",
        open && "border-cos-brand-sage bg-cos-card shadow-[0_0_0_3px_rgba(107,129,113,0.12)]",
        isDragging && "z-10 opacity-40",
        isOver && !isDragging && "border-[#d4a84b] shadow-[0_0_0_3px_rgba(212,168,75,0.2)]",
      )}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label={`Drag ${milestone.name}`}
          className="cursor-grab px-2 text-cos-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3 pr-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="w-[52px] rounded-[12px] bg-[linear-gradient(155deg,#c4922e,#e0b65a)] px-1 py-2 text-center text-[#2a2622]">
            <div className="text-[10px] font-extrabold tracking-wide uppercase">
              {mo}
            </div>
            <div className="font-display text-xl font-bold leading-none">{dy}</div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-cos-text">
              {index + 1}. {milestone.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-cos-muted">
              {CATEGORY_LABELS[milestone.category]}
              {milestone.purpose ? ` · ${milestone.purpose}` : ""}
              {!open ? " · click to edit" : ""}
            </p>
          </div>

          <span
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-extrabold tracking-wide uppercase whitespace-nowrap",
              STATUS_STYLES[status],
            )}
          >
            {MILESTONE_STATUS_LABELS[status]}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 text-cos-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-cos-border bg-[rgba(249,247,242,0.65)] px-4 py-3">
          <p className="text-sm text-cos-muted">
            {milestone.purpose || "No purpose set yet."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <MetaPlatformBadges size="md" />
            <span className="text-xs text-cos-muted">
              Suggested {mo} {dy}
            </span>
          </div>
          <div className="relative flex flex-wrap gap-2">
            {onGenerate ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isGenerating}
                onClick={() => onGenerate(milestone.id)}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => onEdit(milestone.id)}
            >
              <Pencil className="h-4 w-4" />
              Edit milestone
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onToggleMenu(milestone.id)}
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </Button>
            {menuOpenId === milestone.id ? (
              <div className="absolute right-0 bottom-full z-20 mb-1 min-w-[10rem] overflow-hidden rounded-[14px] border border-cos-border bg-cos-card py-1 shadow-lg">
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
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
