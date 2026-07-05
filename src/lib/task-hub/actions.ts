"use server";

import { revalidatePath } from "next/cache";
import {
  persistTaskHubTaskSortOrders,
  updateEventPlaybookTaskStatus,
} from "@/lib/event-playbooks/mutations";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

function revalidateTaskHubPaths(eventIds: string[]) {
  revalidatePath("/tasks");
  for (const eventId of eventIds) {
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
  }
  revalidatePath("/calendar");
}

export async function reorderTaskHubTasksAction(
  orderedTasks: { id: string; eventId: string }[],
): Promise<{ success: boolean; error: string | null }> {
  const byEvent = new Map<string, { id: string; sortOrder: number }[]>();

  for (const task of orderedTasks) {
    const bucket = byEvent.get(task.eventId) ?? [];
    bucket.push({ id: task.id, sortOrder: bucket.length });
    byEvent.set(task.eventId, bucket);
  }

  const updates = [...byEvent.entries()].map(([eventId, tasks]) => ({
    eventId,
    tasks,
  }));

  const ok = await persistTaskHubTaskSortOrders(updates);
  if (!ok) {
    return { success: false, error: "Unable to save task order." };
  }

  revalidateTaskHubPaths([...byEvent.keys()]);
  return { success: true, error: null };
}

export async function updateTaskHubTaskStatusAction(
  eventId: string,
  taskId: string,
  status: EventPlaybookTaskStatus,
  taskTitle: string,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlaybookTaskStatus(taskId, eventId, status, taskTitle);
  if (!ok) {
    return { success: false, error: "Unable to update task." };
  }

  revalidateTaskHubPaths([eventId]);
  return { success: true, error: null };
}
