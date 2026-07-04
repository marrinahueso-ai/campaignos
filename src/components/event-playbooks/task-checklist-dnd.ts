"use client";

export const TASK_DRAG_MIME = "application/x-campaignos-playbook-task";
export const GROUP_DRAG_MIME = "application/x-campaignos-playbook-task-group";

export type TaskDragPayload = {
  type: "task";
  taskId: string;
  sectionKey: string;
};

export type GroupDragPayload = {
  type: "group";
  groupId: string;
};

export type ChecklistDragPayload = TaskDragPayload | GroupDragPayload;

export function encodeDragPayload(payload: ChecklistDragPayload): string {
  return JSON.stringify(payload);
}

export function parseDragPayload(raw: string): ChecklistDragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ChecklistDragPayload;
    if (parsed.type === "task" && parsed.taskId && parsed.sectionKey) {
      return parsed;
    }
    if (parsed.type === "group" && parsed.groupId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readChecklistDragPayload(
  event: React.DragEvent | DragEvent,
): ChecklistDragPayload | null {
  const transfer = "dataTransfer" in event ? event.dataTransfer : null;
  if (!transfer) {
    return null;
  }

  const raw =
    transfer.getData(TASK_DRAG_MIME) ||
    transfer.getData(GROUP_DRAG_MIME) ||
    transfer.getData("text/plain");
  return parseDragPayload(raw);
}

export function setTaskDragData(event: React.DragEvent, payload: TaskDragPayload) {
  const encoded = encodeDragPayload(payload);
  event.dataTransfer.setData(TASK_DRAG_MIME, encoded);
  event.dataTransfer.setData("text/plain", encoded);
  event.dataTransfer.effectAllowed = "move";
}

export function setGroupDragData(event: React.DragEvent, payload: GroupDragPayload) {
  const encoded = encodeDragPayload(payload);
  event.dataTransfer.setData(GROUP_DRAG_MIME, encoded);
  event.dataTransfer.setData("text/plain", encoded);
  event.dataTransfer.effectAllowed = "move";
}
