"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { MetaPlatformIcons } from "@/components/communications-planning-calendar/MetaPlatformIcons";
import {
  DISPLAY_STATUS_LABELS,
  DISPLAY_STATUS_STYLES,
  getCalendarItemDisplayTitle,
  getDisplayStatus,
  getPrimaryChannelLabel,
  isMetaMilestoneItem,
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
}

export function PlanningCalendarItemChip({
  item,
  compact = false,
  onSelect,
}: PlanningCalendarItemChipProps) {
  const displayStatus = getDisplayStatus(item);
  const statusStyles = DISPLAY_STATUS_STYLES[displayStatus];
  const channelLabel = getPrimaryChannelLabel(item);
  const isMetaPost = isMetaMilestoneItem(item);
  const displayTitle = getCalendarItemDisplayTitle(item);
  const isDraggable = displayStatus !== "published";
  const didDragRef = useRef(false);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    didDragRef.current = false;
    const payload = serializeDragPayload(item);
    event.dataTransfer.setData(DRAG_MIME, payload);
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrag(_event: React.DragEvent<HTMLDivElement>) {
    didDragRef.current = true;
  }

  function handleDragEnd() {
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
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDrag={isDraggable ? handleDrag : undefined}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group w-full rounded-lg border text-left transition-all duration-200",
        isDraggable && "cursor-grab active:cursor-grabbing",
        !isDraggable && "cursor-pointer",
        "hover:shadow-sm hover:ring-2 hover:ring-cos-border/80",
        statusStyles.bg,
        statusStyles.border,
        item.isToday && displayStatus !== "overdue" && "ring-2 ring-cos-primary/40",
        compact ? "px-2 py-1.5" : "px-2.5 py-2",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
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
    </div>
  );
}

export { DRAG_MIME };
