import { resolveTaskDisplayStatus } from "@/lib/task-hub/grouping";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";

export type TaskHubSortMode =
  | "default"
  | "title"
  | "due_date_asc"
  | "due_date_desc"
  | "status";

export type TaskHubStatusFilter = "all" | EventPlaybookTaskStatus;

function effectiveDueDate(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

const STATUS_SORT_ORDER: Record<EventPlaybookTaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  blocked: 2,
  done: 3,
};

export function filterAndSortTasks(
  tasks: TaskHubTaskItem[],
  options: {
    searchQuery: string;
    statusFilter: TaskHubStatusFilter;
    sortMode: TaskHubSortMode;
    statusOverrides?: Record<string, EventPlaybookTaskStatus>;
  },
): TaskHubTaskItem[] {
  const query = options.searchQuery.trim().toLowerCase();
  let result = [...tasks];

  if (query) {
    result = result.filter((task) => {
      const haystack = [
        task.title,
        task.event.eventTitle,
        task.assigneeName,
        task.event.eventDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (options.statusFilter !== "all") {
    result = result.filter((task) => {
      const status = resolveTaskDisplayStatus(task, options.statusOverrides?.[task.id]);
      return status === options.statusFilter;
    });
  }

  switch (options.sortMode) {
    case "title":
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "due_date_asc":
      result.sort((a, b) => compareDueDates(a, b));
      break;
    case "due_date_desc":
      result.sort((a, b) => compareDueDates(b, a));
      break;
    case "status":
      result.sort((a, b) => {
        const statusA = resolveTaskDisplayStatus(a, options.statusOverrides?.[a.id]);
        const statusB = resolveTaskDisplayStatus(b, options.statusOverrides?.[b.id]);
        return STATUS_SORT_ORDER[statusA] - STATUS_SORT_ORDER[statusB];
      });
      break;
    default:
      break;
  }

  return result;
}

function compareDueDates(a: TaskHubTaskItem, b: TaskHubTaskItem): number {
  const dateA = effectiveDueDate(a);
  const dateB = effectiveDueDate(b);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA.localeCompare(dateB);
}
