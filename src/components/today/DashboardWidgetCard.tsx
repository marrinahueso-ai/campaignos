"use client";

import type { LucideIcon } from "lucide-react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { useDashboardWidgetDragHandle } from "@/components/today/DashboardWidgetDragContext";
import { cn } from "@/lib/utils/cn";

interface DashboardWidgetCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the header control (Weather uses this). */
  showMenu?: boolean;
}

export function DashboardWidgetCard({
  icon: Icon,
  title,
  children,
  className,
  showMenu = true,
}: DashboardWidgetCardProps) {
  const drag = useDashboardWidgetDragHandle();
  const canDrag = Boolean(drag && !drag.disabled);
  const editing = Boolean(drag?.editing);
  // Grip for drag anytime; decorative ··· only while editing (and not draggable).
  const showDragHandle = showMenu && canDrag;
  const showEllipsis = showMenu && editing && !canDrag;

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl bg-cos-bg-alt p-5 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
          <h2 className="truncate text-sm font-semibold text-cos-text">{title}</h2>
        </div>
        {showDragHandle ? (
          <button
            type="button"
            className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-cos-muted transition-colors hover:bg-cos-card hover:text-cos-text active:cursor-grabbing"
            aria-label={`Drag to move ${title}`}
            title="Drag to move"
            {...drag!.attributes}
            {...drag!.listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        ) : showEllipsis ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cos-muted"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
