import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";

export type TasksV2KanbanBoardMode = "status" | "focus";

export type FocusBoardColumn = "todo" | "this_week" | "in_progress" | "done";

export const FOCUS_BOARD_COLUMNS: FocusBoardColumn[] = [
  "todo",
  "this_week",
  "in_progress",
  "done",
];

export const FOCUS_BOARD_LABELS: Record<FocusBoardColumn, string> = {
  todo: "To-do",
  this_week: "This week",
  in_progress: "In progress",
  done: "Done",
};

/** Soft WIP limit shown on In progress (screenshot-style “3 / 5”). */
export const FOCUS_IN_PROGRESS_WIP_LIMIT = 5;

function effectiveDueDate(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

export function isDueThisWeek(
  dueDate: string | null,
  today = getTodayDateString(),
): boolean {
  if (!dueDate) {
    return false;
  }
  const weekEnd = addDaysToDateOnly(today, 7);
  return dueDate >= today && dueDate <= weekEnd;
}

export function resolveFocusBoardColumn(
  task: TaskHubTaskItem,
  statusOverride?: EventPlaybookTaskStatus,
  today = getTodayDateString(),
): FocusBoardColumn {
  const status = statusOverride ?? task.status;
  if (status === "done") {
    return "done";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  if (isDueThisWeek(effectiveDueDate(task), today)) {
    return "this_week";
  }
  return "todo";
}

export function groupTasksByFocusColumn(
  tasks: TaskHubTaskItem[],
  statusOverrides: Record<string, EventPlaybookTaskStatus> = {},
  today = getTodayDateString(),
): Record<FocusBoardColumn, TaskHubTaskItem[]> {
  const groups: Record<FocusBoardColumn, TaskHubTaskItem[]> = {
    todo: [],
    this_week: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    const column = resolveFocusBoardColumn(
      task,
      statusOverrides[task.id],
      today,
    );
    groups[column].push(task);
  }

  return groups;
}

export type FocusBoardDropPatch = {
  status: EventPlaybookTaskStatus;
  dueDate?: string | null;
};

/** Map a focus-column drop to status / due-date updates. */
export function focusColumnDropPatch(
  column: FocusBoardColumn,
  today = getTodayDateString(),
): FocusBoardDropPatch {
  switch (column) {
    case "done":
      return { status: "done" };
    case "in_progress":
      return { status: "in_progress" };
    case "this_week":
      return {
        status: "todo",
        dueDate: today,
      };
    case "todo":
    default:
      return {
        status: "todo",
        dueDate: null,
      };
  }
}
