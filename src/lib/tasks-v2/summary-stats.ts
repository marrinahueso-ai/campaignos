import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { getTodayDateString, addDaysToDateOnly } from "@/lib/utils/dates";
import type { TasksV2SummaryStats } from "@/types/tasks-v2";
import type { TaskHubTaskItem } from "@/types/task-hub";

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

export function computeTasksV2SummaryStats(
  tasks: TaskHubTaskItem[],
  today = getTodayDateString(),
): TasksV2SummaryStats {
  const weekEnd = addDaysToDateOnly(today, 7);
  let tasksDue = 0;
  let overdue = 0;
  let completedThisMonth = 0;

  for (const task of tasks) {
    if (isCompletedThisMonth(task, today)) {
      completedThisMonth += 1;
    }

    if (!isOpenTaskStatus(task.status)) {
      continue;
    }

    const dueDate = effectiveDueDate(task);
    if (!dueDate) {
      continue;
    }

    if (dueDate < today) {
      overdue += 1;
    } else if (dueDate <= weekEnd) {
      tasksDue += 1;
    }
  }

  return { tasksDue, overdue, completedThisMonth };
}
