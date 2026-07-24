"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createEventPlaybookTask,
  deleteEventPlaybookTask,
  persistTaskHubTaskSortOrders,
  updateEventPlaybookTask,
} from "@/lib/event-playbooks/mutations";
import { getEventPlaybookEvents } from "@/lib/event-playbooks/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import { pushTaskCreateToMonday, pushTaskUpdateToMonday } from "@/lib/monday/sync";
import { deriveInitials } from "@/lib/task-hub/org-members";
import { assertTaskHubEventAccess } from "@/lib/task-hub/permissions";
import { resolveSiteUrlFromHeaders } from "@/lib/site/url";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

function revalidateTaskHubPaths(eventIds: string[]) {
  // Keep the hot path light — full /events + /calendar refreshes made every
  // field save feel slow on the Tasks page.
  revalidatePath("/tasks");
  for (const eventId of eventIds) {
    revalidatePath(`/events/${eventId}`);
  }
}

function queueMondayTaskSync(
  organizationId: string,
  taskId: string,
  eventId: string,
  mode: "create" | "update",
): void {
  void syncTaskToMonday(organizationId, taskId, eventId, mode).catch(
    (error) => {
      console.error("[task-hub] Monday sync failed:", error);
    },
  );
}

async function resolveOrigin(): Promise<string> {
  const headerStore = await headers();
  return resolveSiteUrlFromHeaders(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );
}

async function syncTaskToMonday(
  organizationId: string,
  taskId: string,
  eventId: string,
  mode: "create" | "update",
): Promise<void> {
  if (!isMondayIntegrationEnabled()) {
    return;
  }

  const origin = await resolveOrigin();
  if (mode === "create") {
    const [events, workspace] = await Promise.all([
      getEventPlaybookEvents(organizationId),
      getOrganizationWorkspaceData(organizationId),
    ]);
    if (!workspace) {
      return;
    }
    await pushTaskCreateToMonday({
      organizationId,
      taskId,
      eventId,
      origin,
      events,
      workspace,
    });
    return;
  }

  await pushTaskUpdateToMonday({
    organizationId,
    taskId,
    eventId,
    origin,
  });
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
  const access = await assertTaskHubEventAccess(eventId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const ok = await updateEventPlaybookTask(
    taskId,
    eventId,
    { status },
    taskTitle,
  );
  if (!ok) {
    return { success: false, error: "Unable to update task." };
  }

  queueMondayTaskSync(access.organizationId, taskId, eventId, "update");
  revalidateTaskHubPaths([eventId]);
  return { success: true, error: null };
}

export async function updateTaskHubTaskAction(
  eventId: string,
  taskId: string,
  input: {
    title?: string;
    status?: EventPlaybookTaskStatus;
    dueDate?: string | null;
    assigneeName?: string | null;
    assigneeInitials?: string | null;
    assigneeUserId?: string | null;
    notes?: string | null;
  },
  taskTitleForActivity?: string,
): Promise<{ success: boolean; error: string | null }> {
  const access = await assertTaskHubEventAccess(eventId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  if (input.title !== undefined && !input.title.trim()) {
    return { success: false, error: "Task title is required." };
  }

  const payload = {
    ...input,
    title: input.title?.trim(),
    assigneeName:
      input.assigneeName === undefined
        ? undefined
        : input.assigneeName?.trim() || null,
    assigneeInitials:
      input.assigneeInitials === undefined
        ? input.assigneeName !== undefined
          ? input.assigneeName?.trim()
            ? deriveInitials(input.assigneeName.trim())
            : null
          : undefined
        : input.assigneeInitials,
    assigneeUserId:
      input.assigneeUserId === undefined
        ? undefined
        : input.assigneeUserId?.trim() || null,
    notes:
      input.notes === undefined
        ? undefined
        : input.notes?.trim() || null,
  };

  const ok = await updateEventPlaybookTask(
    taskId,
    eventId,
    payload,
    taskTitleForActivity ?? input.title,
  );
  if (!ok) {
    return { success: false, error: "Unable to update task." };
  }

  queueMondayTaskSync(access.organizationId, taskId, eventId, "update");
  revalidateTaskHubPaths([eventId]);
  return { success: true, error: null };
}

export async function createTaskHubTaskAction(
  eventId: string,
  input: {
    title: string;
    dueDate?: string | null;
    assigneeName?: string | null;
    assigneeInitials?: string | null;
    assigneeUserId?: string | null;
  },
): Promise<{ success: boolean; error: string | null; taskId: string | null }> {
  const access = await assertTaskHubEventAccess(eventId);
  if (!access.ok) {
    return { success: false, error: access.error, taskId: null };
  }

  const trimmed = input.title.trim();
  if (!trimmed) {
    return { success: false, error: "Task title is required.", taskId: null };
  }

  const assigneeName = input.assigneeName?.trim() || null;
  const assigneeInitials =
    input.assigneeInitials?.trim() ||
    (assigneeName ? deriveInitials(assigneeName) : null);
  const assigneeUserId = input.assigneeUserId?.trim() || null;

  const taskId = await createEventPlaybookTask(eventId, {
    title: trimmed,
    dueDate: input.dueDate ?? null,
    assigneeName,
    assigneeInitials,
    assigneeUserId,
  });

  if (!taskId) {
    return { success: false, error: "Unable to create task.", taskId: null };
  }

  queueMondayTaskSync(access.organizationId, taskId, eventId, "create");
  revalidateTaskHubPaths([eventId]);
  return { success: true, error: null, taskId };
}

export async function deleteTaskHubTaskAction(
  eventId: string,
  taskId: string,
  taskTitle: string,
): Promise<{ success: boolean; error: string | null }> {
  const access = await assertTaskHubEventAccess(eventId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const ok = await deleteEventPlaybookTask(taskId, eventId, taskTitle);
  if (!ok) {
    return { success: false, error: "Unable to delete task." };
  }

  revalidateTaskHubPaths([eventId]);
  return { success: true, error: null };
}
