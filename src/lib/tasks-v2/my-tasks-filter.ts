import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { taskAssigneeMatchesUser } from "@/lib/task-hub/access";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup, TasksV2Viewer } from "@/types/tasks-v2";

export type TasksV2MyViewId =
  | "my_tasks"
  | "assigned"
  | "this_week"
  | "overdue"
  | "completed";

function effectiveDueDate(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

/** Prefer auth user id; fall back to legacy name match for unmigrated rows. */
export function taskMatchesViewer(
  task: TaskHubTaskItem,
  viewer: TasksV2Viewer,
): boolean {
  if (viewer.userId && task.assigneeUserId) {
    return task.assigneeUserId === viewer.userId;
  }

  if (viewer.userId && task.assigneeUserId === null) {
    return taskAssigneeMatchesUser(task.assigneeName, viewer);
  }

  return false;
}

export type FilterTasksForMyViewOptions = {
  /**
   * Kanban / Focus board needs Done cards to stay visible.
   * Table “My Tasks” views stay open-only unless view is `completed`.
   */
  includeDone?: boolean;
};

export function filterTasksForMyView(
  tasks: TaskHubTaskItem[],
  viewer: TasksV2Viewer,
  view: TasksV2MyViewId,
  today = getTodayDateString(),
  options?: FilterTasksForMyViewOptions,
): TaskHubTaskItem[] {
  const weekEnd = addDaysToDateOnly(today, 7);
  const mine = tasks.filter((task) => taskMatchesViewer(task, viewer));
  const myDone = () => mine.filter((task) => task.status === "done");
  const withDone = (open: TaskHubTaskItem[]) =>
    options?.includeDone ? [...open, ...myDone()] : open;

  switch (view) {
    case "my_tasks":
    case "assigned":
      return withDone(mine.filter((task) => isOpenTaskStatus(task.status)));
    case "this_week":
      return withDone(
        mine.filter((task) => {
          if (!isOpenTaskStatus(task.status)) return false;
          const due = effectiveDueDate(task);
          return Boolean(due && due >= today && due <= weekEnd);
        }),
      );
    case "overdue":
      return withDone(
        mine.filter((task) => {
          if (!isOpenTaskStatus(task.status)) return false;
          const due = effectiveDueDate(task);
          return Boolean(due && due < today);
        }),
      );
    case "completed":
      return myDone();
    default:
      return mine;
  }
}

export function filterEventGroupsByTasks(
  groups: TasksV2EventGroup[],
  keepTask: (task: TaskHubTaskItem) => boolean,
): TasksV2EventGroup[] {
  return groups
    .map((group) => {
      const tasks = group.tasks.filter(keepTask);
      if (tasks.length === 0) {
        return null;
      }
      return {
        ...group,
        tasks,
        doneCount: tasks.filter((task) => task.status === "done").length,
        totalCount: tasks.length,
      };
    })
    .filter((group): group is TasksV2EventGroup => group !== null);
}

export function filterEventGroupsForMyView(
  groups: TasksV2EventGroup[],
  viewer: TasksV2Viewer,
  view: TasksV2MyViewId,
  options?: FilterTasksForMyViewOptions,
): TasksV2EventGroup[] {
  const allowedIds = new Set(
    filterTasksForMyView(
      groups.flatMap((group) => group.tasks),
      viewer,
      view,
      getTodayDateString(),
      options,
    ).map((task) => task.id),
  );
  return filterEventGroupsByTasks(groups, (task) => allowedIds.has(task.id));
}
