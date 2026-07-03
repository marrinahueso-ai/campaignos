"use client";

import { useCallback, useEffect, useState } from "react";
import { reschedulePlanningItemAction } from "@/lib/communications-calendar/planning-actions";
import {
  DRAG_MIME,
  parseDragPayload,
  type PlanningDragPayload,
} from "@/components/communications-planning-calendar/PlanningCalendarItemChip";

export function readDragPayload(
  event: React.DragEvent,
): PlanningDragPayload | null {
  const raw =
    event.dataTransfer.getData(DRAG_MIME) ||
    event.dataTransfer.getData("text/plain");
  return parseDragPayload(raw);
}

export function useCalendarDragState() {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    function startDrag() {
      setIsDragging(true);
    }

    function endDrag() {
      setIsDragging(false);
    }

    document.addEventListener("dragstart", startDrag);
    document.addEventListener("dragend", endDrag);
    document.addEventListener("drop", endDrag);
    return () => {
      document.removeEventListener("dragstart", startDrag);
      document.removeEventListener("dragend", endDrag);
      document.removeEventListener("drop", endDrag);
    };
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragging(true);
  }, []);

  return { isDragging, setIsDragging, handleDragOver };
}

export type RescheduleDropInput = {
  date: string;
  hour?: number;
  timezone?: string;
  onRescheduled: () => void;
  onError: (message: string) => void;
};

export async function executeRescheduleDrop(
  event: React.DragEvent,
  input: RescheduleDropInput,
): Promise<void> {
  event.preventDefault();
  const payload = readDragPayload(event);
  if (!payload) {
    input.onError("Could not read the dragged item. Try again.");
    return;
  }

  const result = await reschedulePlanningItemAction({
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    newDate: input.date,
    eventId: payload.eventId,
    timelineStepId: payload.timelineStepId,
    channel: payload.channel,
    ...(input.hour !== undefined && input.timezone
      ? { newHour: input.hour, timezone: input.timezone }
      : {}),
  });

  if (result.success) {
    input.onRescheduled();
    return;
  }

  input.onError(result.error ?? "Unable to reschedule this item.");
}
