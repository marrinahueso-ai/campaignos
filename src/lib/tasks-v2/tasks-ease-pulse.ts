import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { taskMatchesViewer } from "@/lib/tasks-v2/my-tasks-filter";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2Viewer } from "@/types/tasks-v2";

/** Quiet text-link pulse filters above the event list/board (Ease mockup). */
export type TasksEasePulse = "needs" | "week" | "overdue" | "done";

export const TASKS_EASE_PULSE_OPTIONS: {
  id: TasksEasePulse;
  label: string;
}[] = [
  { id: "needs", label: "Needs you" },
  { id: "week", label: "This week" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Done" },
];

export function parseTasksEasePulse(value: string | null): TasksEasePulse | null {
  if (value === "needs" || value === "week" || value === "overdue" || value === "done") {
    return value;
  }
  return null;
}

function effectiveDueDate(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

/** Applies within the current scope (Team or Mine) — pulse narrows further. */
export function taskMatchesTasksEasePulse(
  task: TaskHubTaskItem,
  pulse: TasksEasePulse,
  viewer: TasksV2Viewer,
  today = getTodayDateString(),
): boolean {
  switch (pulse) {
    case "needs":
      return taskMatchesViewer(task, viewer) && isOpenTaskStatus(task.status);
    case "week": {
      if (!isOpenTaskStatus(task.status)) return false;
      const due = effectiveDueDate(task);
      const weekEnd = addDaysToDateOnly(today, 7);
      return Boolean(due && due >= today && due <= weekEnd);
    }
    case "overdue": {
      if (!isOpenTaskStatus(task.status)) return false;
      const due = effectiveDueDate(task);
      return Boolean(due && due < today);
    }
    case "done":
      return task.status === "done";
    default:
      return true;
  }
}

export interface TasksEasePulseCounts {
  needs: number;
  week: number;
  overdue: number;
  done: number;
}

export function computeTasksEasePulseCounts(
  tasks: TaskHubTaskItem[],
  viewer: TasksV2Viewer,
  today = getTodayDateString(),
): TasksEasePulseCounts {
  const counts: TasksEasePulseCounts = { needs: 0, week: 0, overdue: 0, done: 0 };
  for (const task of tasks) {
    if (taskMatchesTasksEasePulse(task, "needs", viewer, today)) counts.needs += 1;
    if (taskMatchesTasksEasePulse(task, "week", viewer, today)) counts.week += 1;
    if (taskMatchesTasksEasePulse(task, "overdue", viewer, today)) counts.overdue += 1;
    if (taskMatchesTasksEasePulse(task, "done", viewer, today)) counts.done += 1;
  }
  return counts;
}
