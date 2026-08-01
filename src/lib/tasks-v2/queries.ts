import "server-only";

import { getAiAssistantStatus } from "@/lib/ai";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import {
  getTaskHubPageData,
  getTaskHubPageDataForEvent,
} from "@/lib/task-hub/queries";
import { computeTasksV2SummaryStats } from "@/lib/tasks-v2/summary-stats";
import { groupTasksByEvent } from "@/lib/tasks-v2/group-by-event";
import type { TasksV2PageData, TasksV2Viewer } from "@/types/tasks-v2";

async function resolveTasksV2Viewer(): Promise<TasksV2Viewer> {
  const [authUser, membership] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
  ]);
  return {
    userId: authUser?.id ?? membership?.user.userId ?? null,
    displayName:
      authUser?.displayName ?? membership?.user.displayName ?? null,
    email: authUser?.email ?? membership?.user.email ?? null,
  };
}

/**
 * Safety net — list queries already omit note bodies at the SQL select.
 * Keeps presence (`hasNotes`) if a caller still attached a body.
 */
function slimTaskNotesForList<T extends { notes: string | null; hasNotes?: boolean }>(
  task: T,
): T {
  const hasNotes = task.hasNotes === true || Boolean(task.notes?.trim());
  if (!hasNotes && task.notes == null) {
    return task;
  }
  return {
    ...task,
    notes: null,
    hasNotes,
  };
}

export async function getTasksV2PageData(): Promise<TasksV2PageData> {
  const [hubData, viewer, membership] = await Promise.all([
    getTaskHubPageData({ includeMonday: false }),
    resolveTasksV2Viewer(),
    getActiveMembership(),
  ]);
  const allTasks = flattenCommitteeTasks(hubData.committees).map(
    slimTaskNotesForList,
  );
  const eventGroups = groupTasksByEvent(allTasks);
  const summary = computeTasksV2SummaryStats(allTasks);
  const aiStatus = getAiAssistantStatus();

  return {
    ...hubData,
    committees: hubData.committees.map((group) => ({
      ...group,
      tasks: group.tasks.map(slimTaskNotesForList),
    })),
    eventGroups,
    summary,
    aiAvailable: aiStatus.available,
    aiUnavailableReason: aiStatus.reason,
    viewer,
    organizationId: membership?.organizationId ?? null,
  };
}

/** Event Detail Tasks tab — exact-event tasks only, no Monday board. */
export async function getTasksV2PageDataForEvent(
  eventId: string,
  eventMeta: { title: string; date: string },
  context?: import("@/lib/task-hub/queries").EventTaskHubContext,
): Promise<TasksV2PageData> {
  const [hubData, viewer, membership] = await Promise.all([
    getTaskHubPageDataForEvent(eventId, eventMeta, context),
    resolveTasksV2Viewer(),
    getActiveMembership(),
  ]);
  const allTasks = flattenCommitteeTasks(hubData.committees).map(
    slimTaskNotesForList,
  );
  const eventGroups = groupTasksByEvent(allTasks);
  const summary = computeTasksV2SummaryStats(allTasks);
  const aiStatus = getAiAssistantStatus();

  return {
    ...hubData,
    committees: hubData.committees.map((group) => ({
      ...group,
      tasks: group.tasks.map(slimTaskNotesForList),
    })),
    eventGroups,
    summary,
    aiAvailable: aiStatus.available,
    aiUnavailableReason: aiStatus.reason,
    viewer,
    organizationId: membership?.organizationId ?? null,
  };
}
