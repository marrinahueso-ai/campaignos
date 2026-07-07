"use client";

import {
  Bell,
  CalendarDays,
  GripVertical,
  Megaphone,
  MoreHorizontal,
  Star,
} from "lucide-react";
import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { MilestoneStepProgressIcons } from "@/components/event-workspace/plan/MilestoneStepProgressIcons";
import {
  formatMilestoneTiming,
  resolveSelectedPlatforms,
  type MilestonePlanningItem,
  type MilestoneStepProgress,
} from "@/components/event-workspace/plan/milestone-planning-utils";
import { cn } from "@/lib/utils/cn";

const CATEGORY_STYLES = [
  { icon: CalendarDays, bg: "#E8F3F0", color: "#006B5D" },
  { icon: Megaphone, bg: "#F5F0E0", color: "#8A5A00" },
  { icon: Bell, bg: "#FDF0E8", color: "#C45A00" },
  { icon: Star, bg: "#E8EEF8", color: "#004B87" },
] as const;

interface MilestonePlanningRowProps {
  milestone: MilestonePlanningItem;
  stepProgress: MilestoneStepProgress;
  index: number;
  isExpanded: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onToggleExpand: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function PlatformCell({ milestone }: { milestone: MilestonePlanningItem }) {
  const platforms = resolveSelectedPlatforms(milestone);

  if (platforms.length === 0) {
    return <span className="text-xs text-cos-muted">—</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cos-muted">
      {platforms.map((platform) => (
        <span key={platform} className="inline-flex items-center gap-1.5">
          {platform === "facebook" ? (
            <FacebookPlatformIcon className="h-3.5 w-3.5" />
          ) : (
            <InstagramPlatformIcon className="h-3.5 w-3.5" />
          )}
          {platform === "facebook" ? "Facebook" : "Instagram"}
        </span>
      ))}
    </span>
  );
}

export function MilestonePlanningRow({
  milestone,
  stepProgress,
  index,
  isExpanded,
  isDragging,
  isDragOver,
  onToggleExpand,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: MilestonePlanningRowProps) {
  const category = CATEGORY_STYLES[index % CATEGORY_STYLES.length];
  const CategoryIcon = category.icon;
  const timingLabel = formatMilestoneTiming(milestone.dueDate, milestone.scheduleTime);

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      className={cn(
        "grid cursor-pointer items-center gap-2 border-b border-cos-border px-4 py-3.5 transition-colors sm:grid-cols-[auto_minmax(0,2.25fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto_auto]",
        isDragging && "opacity-40",
        isDragOver && "bg-cos-bg",
        isExpanded && "bg-cos-bg",
      )}
      onClick={onToggleExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleExpand();
        }
      }}
      aria-expanded={isExpanded}
    >
      <button
        type="button"
        className="cursor-grab text-cos-dark-muted active:cursor-grabbing"
        aria-label={`Drag ${milestone.title}`}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: category.bg, color: category.color }}
        >
          <CategoryIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <MilestoneStepProgressIcons progress={stepProgress} className="gap-0.5" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-cos-text">{milestone.title}</p>
          {milestone.description && (
            <p className="truncate text-xs text-cos-muted">{milestone.description}</p>
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <PlatformCell milestone={milestone} />
      </div>

      <div className="hidden text-sm text-cos-muted sm:block">{timingLabel}</div>

      <div className="hidden sm:block">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            milestone.status === "scheduled"
              ? "bg-cos-success-bg text-cos-success-text"
              : "bg-cos-warning text-cos-warning-text",
          )}
        >
          {milestone.status === "scheduled" ? "Scheduled" : "Not started"}
        </span>
      </div>

      <button
        type="button"
        className="hidden p-1 text-cos-muted hover:text-cos-text sm:inline-flex"
        aria-label={`More actions for ${milestone.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
