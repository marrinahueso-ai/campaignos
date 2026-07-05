import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

export const TASK_STATUS_CYCLE: EventPlaybookTaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export const BOARD_COLUMN_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
] as const satisfies readonly EventPlaybookTaskStatus[];

export type BoardColumnStatus = (typeof BOARD_COLUMN_STATUSES)[number];

export function nextTaskStatus(
  current: EventPlaybookTaskStatus,
): EventPlaybookTaskStatus {
  const index = TASK_STATUS_CYCLE.indexOf(current);
  return TASK_STATUS_CYCLE[(index + 1) % TASK_STATUS_CYCLE.length] ?? "todo";
}

export function taskStatusLabel(status: EventPlaybookTaskStatus): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    default:
      return "To do";
  }
}

export function taskStatusActivityLabel(status: EventPlaybookTaskStatus): string {
  switch (status) {
    case "done":
      return "completed";
    case "in_progress":
      return "started";
    case "blocked":
      return "blocked";
    default:
      return "reopened";
  }
}

export function isOpenTaskStatus(status: EventPlaybookTaskStatus): boolean {
  return status !== "done";
}
