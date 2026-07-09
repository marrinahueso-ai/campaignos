"use client";

export const TASKS_V2_DRAG_MIME = "application/x-campaignos-tasks-v2-task";

export type TasksV2DragPayload = {
  taskId: string;
  eventId: string;
};

export function encodeTasksV2DragPayload(payload: TasksV2DragPayload): string {
  return JSON.stringify(payload);
}

export function parseTasksV2DragPayload(raw: string): TasksV2DragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TasksV2DragPayload;
    if (parsed.taskId && parsed.eventId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readTasksV2DragPayload(
  event: React.DragEvent | DragEvent,
): TasksV2DragPayload | null {
  const transfer = "dataTransfer" in event ? event.dataTransfer : null;
  if (!transfer) {
    return null;
  }

  const raw =
    transfer.getData(TASKS_V2_DRAG_MIME) || transfer.getData("text/plain");
  return parseTasksV2DragPayload(raw);
}

export function setTasksV2DragData(
  event: React.DragEvent,
  payload: TasksV2DragPayload,
) {
  const encoded = encodeTasksV2DragPayload(payload);
  event.dataTransfer.setData(TASKS_V2_DRAG_MIME, encoded);
  event.dataTransfer.setData("text/plain", encoded);
  event.dataTransfer.effectAllowed = "move";
}
