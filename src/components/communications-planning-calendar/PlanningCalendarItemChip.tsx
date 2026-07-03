"use client";

import { useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { MetaPlatformIcons } from "@/components/communications-planning-calendar/MetaPlatformIcons";
import {
  beginCalendarDragSession,
  endCalendarDragSession,
} from "@/components/communications-planning-calendar/planning-calendar-dnd";
import {
  DISPLAY_STATUS_LABELS,
  DISPLAY_STATUS_STYLES,
  getCalendarItemDisplayTitle,
  getDisplayStatus,
  getPrimaryChannelLabel,
  isMetaMilestoneItem,
  isPlanningItemDraggable,
} from "@/lib/communications-calendar/unified-calendar-layers";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

const DRAG_MIME = "application/x-campaignos-planning-item";

export interface PlanningDragPayload {
  id: string;
  sourceType: PlanningCalendarItem["sourceType"];
  sourceId: string;
  eventId: string;
  timelineStepId: string | null;
  channel: PlanningCalendarItem["channel"];
}

export function serializeDragPayload(item: PlanningCalendarItem): string {
  const payload: PlanningDragPayload = {
    id: item.id,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    eventId: item.eventId,
    timelineStepId: item.timelineStepId,
    channel: item.channel,
  };
  return JSON.stringify(payload);
}

export function parseDragPayload(raw: string): PlanningDragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlanningDragPayload;
  } catch {
    return null;
  }
}

interface PlanningCalendarItemChipProps {
  item: PlanningCalendarItem & { isOverdue?: boolean; isToday?: boolean };
  compact?: boolean;
  onSelect?: (item: PlanningCalendarItem) => void;
  onDragError?: (message: string) => void;
}

export function PlanningCalendarItemChip({
  item,
  compact = false,
  onSelect,
  onDragError,
}: PlanningCalendarItemChipProps) {
  const displayStatus = getDisplayStatus(item);
  const statusStyles = DISPLAY_STATUS_STYLES[displayStatus];
  const channelLabel = getPrimaryChannelLabel(item);
  const isMetaPost = isMetaMilestoneItem(item);
  const displayTitle = getCalendarItemDisplayTitle(item);
  const isDraggable = isPlanningItemDraggable(item);
  const didDragRef = useRef(false);

  function reportDragStartFailure(error: unknown) {
    endCalendarDragSession();
    console.error("Calendar drag start failed:", error);
    onDragError?.("Could not start dragging this item. Try again.");
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    didDragRef.current = false;
    event.currentTarget.setAttribute("data-dragging", "true");

    try {
      beginCalendarDragSession();

      const payload = serializeDragPayload(item);
      if (!item.sourceId || !item.sourceType) {
        throw new Error("Invalid drag payload");
      }

      // Safari requires text/plain; set it first.
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.setData(DRAG_MIME, payload);
      event.dataTransfer.effectAllowed = "move";

      if (event.defaultPrevented) {
        throw new Error("Drag start was prevented by the browser");
      }
    } catch (error) {
      reportDragStartFailure(error);
      event.preventDefault();
    }
  }

  function handleDrag(_event: React.DragEvent<HTMLDivElement>) {
    didDragRef.current = true;
  }

  function handleDragEnd(event: React.DragEvent<HTMLDivElement>) {
    event.currentTarget.removeAttribute("data-dragging");
    endCalendarDragSession();
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  }

  function handleClick() {
    if (didDragRef.current) {
      return;
    }

    onSelect?.(item);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(item);
    }
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDrag={isDraggable ? handleDrag : undefined}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={displayTitle}
      data-testid={`calendar-chip-${item.id}`}
      data-draggable={isDraggable ? "true" : "false"}
      className={cn(
        "calendar-drag-chip group flex w-full items-start gap-1.5 rounded-lg border text-left transition-all duration-200",
        isDraggable
          ? "cursor-grab touch-manipulation active:cursor-grabbing"
          : "cursor-pointer",
        "hover:shadow-sm hover:ring-2 hover:ring-cos-border/80",
        statusStyles.bg,
        statusStyles.border,
        item.isToday && displayStatus !== "overdue" && "ring-2 ring-cos-primary/40",
        compact ? "px-1.5 py-1.5" : "px-2 py-2",
      )}
    >
      {isDraggable ? (
        <div
          aria-hidden
          data-testid={`calendar-chip-grip-${item.id}`}
          className={cn(
            "calendar-drag-handle pointer-events-none shrink-0 select-none rounded p-1",
            isMetaPost
              ? "text-cos-accent"
              : "text-cos-border group-hover:text-cos-accent",
          )}
        >
          <GripVertical className={compact ? "h-4 w-4" : "h-4 w-4"} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 select-none">
        <p
          className={cn(
            "truncate font-medium leading-snug",
            compact ? "text-[11px]" : "text-xs",
            statusStyles.text,
          )}
        >
          {displayTitle}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {isMetaPost ? (
            <MetaPlatformIcons size={compact ? "xs" : "sm"} />
          ) : channelLabel ? (
            <span className="rounded bg-white/80 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-cos-muted ring-1 ring-cos-border/80">
              {channelLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[9px] font-medium",
              statusStyles.bg,
              statusStyles.text,
              "ring-1",
              statusStyles.border,
            )}
          >
            {DISPLAY_STATUS_LABELS[displayStatus]}
          </span>
        </div>
        {!compact && item.communicationStrategy && item.communicationType === "event" && (
          <CommunicationStrategyBadge
            strategy={item.communicationStrategy}
            className="mt-1 !px-1.5 !py-0 !text-[9px]"
          />
        )}
      </div>
    </div>
  );
}

export { DRAG_MIME };
