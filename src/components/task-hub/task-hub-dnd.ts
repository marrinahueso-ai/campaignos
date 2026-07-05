"use client";

export const TASK_HUB_DRAG_MIME = "application/x-campaignos-task-hub-task";

export type TaskHubDragPayload = {
  taskId: string;
  committeeKey: string;
  sourceStatus?: string;
};

export function encodeTaskHubDragPayload(payload: TaskHubDragPayload): string {
  return JSON.stringify(payload);
}

export function parseTaskHubDragPayload(raw: string): TaskHubDragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TaskHubDragPayload;
    if (parsed.taskId && parsed.committeeKey) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readTaskHubDragPayload(
  event: React.DragEvent | DragEvent,
): TaskHubDragPayload | null {
  const transfer = "dataTransfer" in event ? event.dataTransfer : null;
  if (!transfer) {
    return null;
  }

  const raw =
    transfer.getData(TASK_HUB_DRAG_MIME) || transfer.getData("text/plain");
  return parseTaskHubDragPayload(raw);
}

export function setTaskHubDragData(
  event: React.DragEvent,
  payload: TaskHubDragPayload,
) {
  const encoded = encodeTaskHubDragPayload(payload);
  event.dataTransfer.setData(TASK_HUB_DRAG_MIME, encoded);
  event.dataTransfer.setData("text/plain", encoded);
  event.dataTransfer.effectAllowed = "move";
}
