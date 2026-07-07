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
import {
  formatMilestoneTiming,
  MILESTONE_PLANNING_COLORS,
  resolvePrimaryPlatform,
  type MilestonePlanningItem,
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
  const platform = resolvePrimaryPlatform(milestone);

  if (!platform) {
    return <span className="text-xs" style={{ color: "#7A7268" }}>—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#7A7268" }}>
      {platform === "facebook" ? (
        <FacebookPlatformIcon className="h-3.5 w-3.5" />
      ) : (
        <InstagramPlatformIcon className="h-3.5 w-3.5" />
      )}
      {platform === "facebook" ? "Facebook" : "Instagram"}
    </span>
  );
}

export function MilestonePlanningRow({
  milestone,
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
        "grid cursor-pointer items-center gap-3 border-b px-4 py-3.5 transition-colors sm:grid-cols-[auto_1fr_0.85fr_1fr_auto_auto]",
        isDragging && "opacity-40",
        isDragOver && "bg-[#FAF7F2]",
        isExpanded && "bg-[#FAF7F2]",
      )}
      style={{ borderColor: MILESTONE_PLANNING_COLORS.border }}
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
        className="cursor-grab text-[#B8AFA4] active:cursor-grabbing"
        aria-label={`Drag ${milestone.title}`}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: category.bg, color: category.color }}
        >
          <CategoryIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className="truncate text-sm font-medium"
            style={{ color: MILESTONE_PLANNING_COLORS.text }}
          >
            {milestone.title}
          </p>
          {milestone.description && (
            <p className="truncate text-xs" style={{ color: "#7A7268" }}>
              {milestone.description}
            </p>
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <PlatformCell milestone={milestone} />
      </div>

      <div className="hidden text-sm sm:block" style={{ color: "#7A7268" }}>
        {timingLabel}
      </div>

      <div className="hidden sm:block">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={
            milestone.status === "scheduled"
              ? {
                  backgroundColor: MILESTONE_PLANNING_COLORS.successBg,
                  color: MILESTONE_PLANNING_COLORS.success,
                }
              : {
                  backgroundColor: MILESTONE_PLANNING_COLORS.notStartedBg,
                  color: MILESTONE_PLANNING_COLORS.notStartedText,
                }
          }
        >
          {milestone.status === "scheduled" ? "Scheduled" : "Not started"}
        </span>
      </div>

      <button
        type="button"
        className="hidden p-1 text-[#7A7268] hover:text-[#1A1A1A] sm:inline-flex"
        aria-label={`More actions for ${milestone.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
