import type { TaskHubTaskItem } from "@/types/task-hub";

export function reorderEventTasks(
  tasks: TaskHubTaskItem[],
  draggedTaskId: string,
  targetTaskId: string,
): TaskHubTaskItem[] | null {
  if (draggedTaskId === targetTaskId) {
    return null;
  }

  const fromIndex = tasks.findIndex((task) => task.id === draggedTaskId);
  const toIndex = tasks.findIndex((task) => task.id === targetTaskId);

  if (fromIndex < 0 || toIndex < 0) {
    return null;
  }

  const next = [...tasks];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return null;
  }
  next.splice(toIndex, 0, moved);
  return next;
}
