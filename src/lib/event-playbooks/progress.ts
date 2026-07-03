import type { EventPlaybookTask } from "@/types/event-playbooks";

export function computePlanningProgress(tasks: EventPlaybookTask[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  const doneCount = tasks.filter((task) => task.status === "done").length;
  return Math.round((doneCount / tasks.length) * 100);
}

export function computePlanningProgressByEventId(
  tasks: EventPlaybookTask[],
): Map<string, number> {
  const byEvent = new Map<string, EventPlaybookTask[]>();

  for (const task of tasks) {
    const existing = byEvent.get(task.eventId) ?? [];
    existing.push(task);
    byEvent.set(task.eventId, existing);
  }

  const progressMap = new Map<string, number>();
  for (const [eventId, eventTasks] of byEvent) {
    progressMap.set(eventId, computePlanningProgress(eventTasks));
  }

  return progressMap;
}
