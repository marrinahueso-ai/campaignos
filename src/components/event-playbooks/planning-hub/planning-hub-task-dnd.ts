"use client";

export const PLANNING_HUB_TASK_DRAG_MIME =
  "application/x-campaignos-planning-hub-task";

export type PlanningHubTaskDragPayload = {
  taskId: string;
};

export function encodePlanningHubTaskDragPayload(
  payload: PlanningHubTaskDragPayload,
): string {
  return JSON.stringify(payload);
}

export function parsePlanningHubTaskDragPayload(
  raw: string,
): PlanningHubTaskDragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PlanningHubTaskDragPayload;
    if (parsed.taskId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readPlanningHubTaskDragPayload(
  event: React.DragEvent | DragEvent,
): PlanningHubTaskDragPayload | null {
  const transfer = "dataTransfer" in event ? event.dataTransfer : null;
  if (!transfer) {
    return null;
  }

  const raw =
    transfer.getData(PLANNING_HUB_TASK_DRAG_MIME) ||
    transfer.getData("text/plain");
  return parsePlanningHubTaskDragPayload(raw);
}

export function setPlanningHubTaskDragData(
  event: React.DragEvent,
  payload: PlanningHubTaskDragPayload,
) {
  const encoded = encodePlanningHubTaskDragPayload(payload);
  event.dataTransfer.setData(PLANNING_HUB_TASK_DRAG_MIME, encoded);
  event.dataTransfer.setData("text/plain", encoded);
  event.dataTransfer.effectAllowed = "move";
}
