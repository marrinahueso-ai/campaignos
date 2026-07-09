import { getTodayDateString } from "@/lib/utils/dates";
import type { TasksV2Priority } from "@/types/tasks-v2";
import type { TaskHubTaskItem } from "@/types/task-hub";

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function deriveTaskPriority(
  task: TaskHubTaskItem,
  today = getTodayDateString(),
): TasksV2Priority {
  if (task.status === "done") {
    return "low";
  }

  if (task.status === "blocked") {
    return "high";
  }

  const dueDate = task.monday?.mondayDueDate ?? task.dueDate;
  if (!dueDate) {
    return task.status === "in_progress" ? "medium" : "low";
  }

  const daysUntilDue = daysBetween(today, dueDate);
  if (daysUntilDue < 0) {
    return "high";
  }
  if (daysUntilDue <= 3) {
    return "high";
  }
  if (daysUntilDue <= 14) {
    return "medium";
  }
  return "low";
}
