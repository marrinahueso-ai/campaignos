import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { getTodayDateString, addDaysToDateOnly } from "@/lib/utils/dates";
import type { TasksV2SummaryFilter, TasksV2SummaryStats } from "@/types/tasks-v2";
import type { TaskHubTaskItem } from "@/types/task-hub";

export type { TasksV2SummaryFilter };

function effectiveDueDate(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

function isCompletedThisMonth(task: TaskHubTaskItem, today: string): boolean {
  if (task.status !== "done") {
    return false;
  }
  const updated = task.updatedAt.slice(0, 10);
  return updated.slice(0, 7) === today.slice(0, 7);
}

/** Matches Tasks page summary-card metrics (all accessible tasks, not My Views). */
export function taskMatchesSummaryFilter(
  task: TaskHubTaskItem,
  filter: TasksV2SummaryFilter,
  today = getTodayDateString(),
): boolean {
  const weekEnd = addDaysToDateOnly(today, 7);

  switch (filter) {
    case "tasks_due": {
      if (!isOpenTaskStatus(task.status)) return false;
      const dueDate = effectiveDueDate(task);
      return Boolean(dueDate && dueDate >= today && dueDate <= weekEnd);
    }
    case "overdue": {
      if (!isOpenTaskStatus(task.status)) return false;
      const dueDate = effectiveDueDate(task);
      return Boolean(dueDate && dueDate < today);
    }
    case "completed":
      return isCompletedThisMonth(task, today);
    default:
      return false;
  }
}

export function parseTasksV2SummaryFilter(
  value: string | null,
): TasksV2SummaryFilter | null {
  if (value === "tasks_due" || value === "overdue" || value === "completed") {
    return value;
  }
  return null;
}

export function computeTasksV2SummaryStats(
  tasks: TaskHubTaskItem[],
  today = getTodayDateString(),
): TasksV2SummaryStats {
  let tasksDue = 0;
  let overdue = 0;
  let completedThisMonth = 0;

  for (const task of tasks) {
    if (taskMatchesSummaryFilter(task, "completed", today)) {
      completedThisMonth += 1;
    }
    if (taskMatchesSummaryFilter(task, "overdue", today)) {
      overdue += 1;
    } else if (taskMatchesSummaryFilter(task, "tasks_due", today)) {
      tasksDue += 1;
    }
  }

  return { tasksDue, overdue, completedThisMonth };
}
