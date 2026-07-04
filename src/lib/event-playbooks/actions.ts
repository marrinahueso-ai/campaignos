"use server";

import { revalidatePath } from "next/cache";
import { getEventById } from "@/lib/events/queries";
import {
  createEventPlaybookFilePlaceholder,
  createEventPlaybookNote,
  createEventPlaybookTask,
  createEventPlaybookTaskGroup,
  deleteEventPlaybookTask,
  deleteEventPlaybookTaskGroup,
  persistEventPlaybookTaskOrder,
  updateEventPlaybookTaskGroupCollapsed,
  updateEventPlaybookTaskStatus,
} from "@/lib/event-playbooks/mutations";
import { generateEventPlaybookInsights } from "@/lib/event-playbooks/insights";
import {
  getEventPlaybookHubData,
  getPastEventLessonsForType,
} from "@/lib/event-playbooks/queries";
import type {
  EventPlaybookInsightsResult,
  EventPlaybookNoteType,
  EventPlaybookTaskStatus,
} from "@/types/event-playbooks";

function revalidatePlaybookPaths(eventId: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/calendar");
}

export async function createEventPlaybookTaskAction(
  eventId: string,
  title: string,
  groupId?: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { success: false, error: "Task title is required." };
  }

  const id = await createEventPlaybookTask(eventId, { title: trimmed, groupId });
  if (!id) {
    return { success: false, error: "Unable to create task." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function updateEventPlaybookTaskStatusAction(
  eventId: string,
  taskId: string,
  status: EventPlaybookTaskStatus,
  taskTitle: string,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlaybookTaskStatus(taskId, eventId, status, taskTitle);
  if (!ok) {
    return { success: false, error: "Unable to update task." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function deleteEventPlaybookTaskAction(
  eventId: string,
  taskId: string,
  taskTitle: string,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await deleteEventPlaybookTask(taskId, eventId, taskTitle);
  if (!ok) {
    return { success: false, error: "Unable to delete task." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function createEventPlaybookTaskGroupAction(
  eventId: string,
  name: string,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Group name is required." };
  }

  const id = await createEventPlaybookTaskGroup(eventId, trimmed);
  if (!id) {
    return { success: false, error: "Unable to create group." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function deleteEventPlaybookTaskGroupAction(
  eventId: string,
  groupId: string,
  groupName: string,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await deleteEventPlaybookTaskGroup(groupId, eventId, groupName);
  if (!ok) {
    return { success: false, error: "Unable to delete group." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function toggleEventPlaybookTaskGroupCollapsedAction(
  eventId: string,
  groupId: string,
  collapsed: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlaybookTaskGroupCollapsed(groupId, eventId, collapsed);
  if (!ok) {
    return { success: false, error: "Unable to update group." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function reorderEventPlaybookTasksAction(
  eventId: string,
  input: {
    groups: { id: string; sortOrder: number }[];
    tasks: { id: string; groupId: string | null; sortOrder: number }[];
  },
): Promise<{ success: boolean; error: string | null }> {
  const ok = await persistEventPlaybookTaskOrder(eventId, input);
  if (!ok) {
    return { success: false, error: "Unable to save task order." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function generateEventPlaybookInsightsAction(
  eventId: string,
): Promise<{
  success: boolean;
  error: string | null;
  insights: EventPlaybookInsightsResult | null;
}> {
  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found.", insights: null };
  }

  const [hubData, pastLessons] = await Promise.all([
    getEventPlaybookHubData(eventId),
    getPastEventLessonsForType(event.eventType, eventId),
  ]);

  const insights = await generateEventPlaybookInsights({
    event,
    notes: hubData.notes,
    tasks: hubData.tasks,
    pastLessons,
  });

  return { success: true, error: null, insights };
}

export async function addPlaybookTaskFromRecommendationAction(
  eventId: string,
  title: string,
): Promise<{ success: boolean; error: string | null; duplicate: boolean }> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { success: false, error: "Task title is required.", duplicate: false };
  }

  const hubData = await getEventPlaybookHubData(eventId);
  const normalized = trimmed.toLowerCase();
  const exists = hubData.tasks.some((t) => t.title.trim().toLowerCase() === normalized);
  if (exists) {
    return { success: true, error: null, duplicate: true };
  }

  const id = await createEventPlaybookTask(eventId, { title: trimmed });
  if (!id) {
    return { success: false, error: "Unable to create task.", duplicate: false };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null, duplicate: false };
}

export async function createEventPlaybookNoteAction(
  eventId: string,
  content: string,
  noteType: EventPlaybookNoteType,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Note content is required." };
  }

  const id = await createEventPlaybookNote(eventId, { content: trimmed, noteType });
  if (!id) {
    return { success: false, error: "Unable to save note." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}

export async function addEventPlaybookFilePlaceholderAction(
  eventId: string,
  name: string,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "File name is required." };
  }

  const id = await createEventPlaybookFilePlaceholder(eventId, trimmed);
  if (!id) {
    return { success: false, error: "Unable to add file." };
  }

  revalidatePlaybookPaths(eventId);
  return { success: true, error: null };
}
