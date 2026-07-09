import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TasksV2DisplayStatus } from "@/types/tasks-v2";

export function tasksV2StatusLabel(status: TasksV2DisplayStatus): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    case "deferred":
      return "Deferred";
    default:
      return "To Do";
  }
}

export const TASKS_V2_STATUS_OPTIONS: EventPlaybookTaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function tasksV2PriorityLabel(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}
