"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reschedulePlanningItemAction } from "@/lib/communications-calendar/planning-actions";
import {
  DRAG_MIME,
  parseDragPayload,
  type PlanningDragPayload,
} from "@/components/communications-planning-calendar/PlanningCalendarItemChip";

export const CALENDAR_DRAGGING_CLASS = "calendar-dragging";

let dragSessionActive = false;

function syncDragSessionDom(active: boolean) {
  document.documentElement.classList.toggle(CALENDAR_DRAGGING_CLASS, active);
}

/** Synchronous — call from chip dragstart before React state updates. */
export function beginCalendarDragSession() {
  if (dragSessionActive) {
    return;
  }

  dragSessionActive = true;
  syncDragSessionDom(true);
}

/** Synchronous — call from dragend/drop. Safe to call multiple times. */
export function endCalendarDragSession() {
  if (!dragSessionActive) {
    return;
  }

  dragSessionActive = false;
  syncDragSessionDom(false);
}

export function isCalendarDragSessionActive(): boolean {
  return dragSessionActive;
}

export function readDragPayload(
  event: React.DragEvent | DragEvent,
): PlanningDragPayload | null {
  const transfer =
    "dataTransfer" in event ? event.dataTransfer : null;
  if (!transfer) {
    return null;
  }

  const raw =
    transfer.getData(DRAG_MIME) || transfer.getData("text/plain");
  return parseDragPayload(raw);
}

export function useCalendarDragState() {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    function startDrag() {
      isDraggingRef.current = true;
      setIsDragging(true);
    }

    function endDrag() {
      isDraggingRef.current = false;
      endCalendarDragSession();
      setIsDragging(false);
    }

    function handleDocumentDragOver(event: DragEvent) {
      if (!isDraggingRef.current && !isCalendarDragSessionActive()) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    }

    document.addEventListener("dragstart", startDrag);
    document.addEventListener("dragend", endDrag);
    document.addEventListener("drop", endDrag);
    document.addEventListener("dragover", handleDocumentDragOver);

    return () => {
      document.removeEventListener("dragstart", startDrag);
      document.removeEventListener("dragend", endDrag);
      document.removeEventListener("drop", endDrag);
      document.removeEventListener("dragover", handleDocumentDragOver);
      if (isDraggingRef.current) {
        endCalendarDragSession();
      }
    };
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
  }, []);

  return { isDragging, setIsDragging, handleDragOver };
}

export type RescheduleDropInput = {
  date: string;
  hour?: number;
  timezone?: string;
  payload: PlanningDragPayload;
  onRescheduled: () => void;
  onSuccess: (message: string) => void;
  onWarning?: (message: string) => void;
  onError: (message: string) => void;
};

/** Read payload synchronously in the drop handler — dataTransfer clears after the event returns. */
export function captureDropPayload(
  event: React.DragEvent,
): PlanningDragPayload | null {
  event.preventDefault();
  event.stopPropagation();
  endCalendarDragSession();
  return readDragPayload(event);
}

export async function executeRescheduleDrop(
  input: RescheduleDropInput,
): Promise<void> {
  const { payload } = input;

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
    if (result.warning) {
      input.onWarning?.(result.warning);
      if (!input.onWarning) {
        input.onSuccess(result.warning);
      }
      return;
    }
    input.onSuccess("Item rescheduled successfully.");
    return;
  }

  input.onError(result.error ?? "Unable to reschedule this item.");
}
