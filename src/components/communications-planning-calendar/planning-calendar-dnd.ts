"use client";

import { useCallback, useEffect, useRef } from "react";
import { reschedulePlanningItemAction } from "@/lib/communications-calendar/planning-actions";
import {
  DRAG_MIME,
  parseDragPayload,
  type PlanningDragPayload,
} from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { localDateHourToIso } from "@/lib/posting-analytics/timezone-utils";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export const CALENDAR_DRAGGING_CLASS = "calendar-dragging";

let dragSessionActive = false;
let dragSessionSafetyTimer: ReturnType<typeof setTimeout> | null = null;

function syncDragSessionDom(active: boolean) {
  document.documentElement.classList.toggle(CALENDAR_DRAGGING_CLASS, active);
}

function clearDragSessionSafetyTimer() {
  if (dragSessionSafetyTimer != null) {
    clearTimeout(dragSessionSafetyTimer);
    dragSessionSafetyTimer = null;
  }
}

/** Synchronous — call from chip dragstart before React state updates. */
export function beginCalendarDragSession() {
  if (dragSessionActive) {
    return;
  }

  dragSessionActive = true;
  syncDragSessionDom(true);
  clearDragSessionSafetyTimer();
  // Prevent a stuck html.calendar-dragging class if dragend never fires.
  dragSessionSafetyTimer = setTimeout(() => {
    endCalendarDragSession();
  }, 15_000);
}

/** Synchronous — call from dragend/drop. Safe to call multiple times. */
export function endCalendarDragSession() {
  clearDragSessionSafetyTimer();
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

export function matchesDragPayload(
  item: PlanningCalendarItem,
  payload: PlanningDragPayload,
): boolean {
  return (
    item.id === payload.id ||
    (item.sourceId === payload.sourceId &&
      item.sourceType === payload.sourceType)
  );
}

/** Instant local move for calendar chips — do not wait on the server action. */
export function applyOptimisticReschedule(
  item: PlanningCalendarItem,
  date: string,
  hour?: number,
  timezone?: string,
): PlanningCalendarItem {
  let scheduledAt = item.scheduledAt ?? null;

  if (typeof hour === "number" && timezone) {
    scheduledAt = localDateHourToIso(date, hour, timezone);
  } else if (scheduledAt?.includes("T")) {
    scheduledAt = `${date}${scheduledAt.slice(scheduledAt.indexOf("T"))}`;
  } else {
    scheduledAt = `${date}T12:00:00.000Z`;
  }

  return {
    ...item,
    scheduledDate: date,
    scheduledAt,
  };
}

/**
 * Safari-safe document drag listeners. Uses refs/DOM only — no React state
 * during drag (avoids full calendar re-renders on every dragover).
 */
export function useCalendarDragState() {
  const isDraggingRef = useRef(false);

  useEffect(() => {
    function startDrag() {
      isDraggingRef.current = true;
    }

    function endDrag() {
      isDraggingRef.current = false;
      endCalendarDragSession();
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
    }
  }, []);

  return { handleDragOver };
}

/** Mark a drop cell active via DOM — avoids React re-renders during drag. */
export function setDropTargetActive(
  element: HTMLElement | null,
  active: boolean,
) {
  if (!element) {
    return;
  }
  if (active) {
    element.setAttribute("data-drop-active", "true");
  } else {
    element.removeAttribute("data-drop-active");
  }
}

export function clearDropTargetActive(element: EventTarget | null) {
  if (element instanceof HTMLElement) {
    element.removeAttribute("data-drop-active");
  }
}

export type RescheduleDropInput = {
  date: string;
  hour?: number;
  timezone?: string;
  payload: PlanningDragPayload;
  onOptimistic?: () => void;
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

  input.onOptimistic?.();

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
