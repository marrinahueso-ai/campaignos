import { eventGroupAccentColor } from "@/lib/tasks-v2/event-colors";
import type { TasksV2EventGroup } from "@/types/tasks-v2";
import type { TaskHubTaskItem } from "@/types/task-hub";

function compareTasks(a: TaskHubTaskItem, b: TaskHubTaskItem): number {
  if (a.dueDate && b.dueDate) {
    const dueCompare = a.dueDate.localeCompare(b.dueDate);
    if (dueCompare !== 0) {
      return dueCompare;
    }
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }
  return a.sortOrder - b.sortOrder;
}

export function groupTasksByEvent(tasks: TaskHubTaskItem[]): TasksV2EventGroup[] {
  const byEvent = new Map<string, TaskHubTaskItem[]>();

  for (const task of tasks) {
    const key = task.event.eventId;
    const bucket = byEvent.get(key) ?? [];
    bucket.push(task);
    byEvent.set(key, bucket);
  }

  const groups: TasksV2EventGroup[] = [];

  let index = 0;
  for (const [, eventTasks] of byEvent) {
    if (eventTasks.length === 0) {
      continue;
    }

    const first = eventTasks[0]!;
    const sorted = [...eventTasks].sort(compareTasks);

    groups.push({
      eventId: first.event.eventId,
      eventTitle: first.event.eventTitle,
      eventDate: first.event.eventDate,
      eventHref: first.event.eventHref,
      accentColor: eventGroupAccentColor(first.event.eventId, index),
      tasks: sorted,
      doneCount: sorted.filter((task) => task.status === "done").length,
      totalCount: sorted.length,
    });
    index += 1;
  }

  return groups.sort(
    (a, b) =>
      a.eventDate.localeCompare(b.eventDate) ||
      a.eventTitle.localeCompare(b.eventTitle),
  );
}

export function flattenEventGroups(groups: TasksV2EventGroup[]): TaskHubTaskItem[] {
  return groups.flatMap((group) => group.tasks);
}
