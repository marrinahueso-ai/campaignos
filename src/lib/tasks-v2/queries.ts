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
    displayName: authUser?.displayName ?? null,
    email: authUser?.email ?? membership?.user.email ?? null,
  };
}

export async function getTasksV2PageData(): Promise<TasksV2PageData> {
  const [hubData, viewer] = await Promise.all([
    getTaskHubPageData({ includeMonday: false }),
    resolveTasksV2Viewer(),
  ]);
  const allTasks = flattenCommitteeTasks(hubData.committees);
  const eventGroups = groupTasksByEvent(allTasks);
  const summary = computeTasksV2SummaryStats(allTasks);
  const aiStatus = getAiAssistantStatus();

  return {
    ...hubData,
    eventGroups,
    summary,
    aiAvailable: aiStatus.available,
    aiUnavailableReason: aiStatus.reason,
    viewer,
  };
}

/** Event Detail Tasks tab — exact-event tasks only, no Monday board. */
export async function getTasksV2PageDataForEvent(
  eventId: string,
  eventMeta: { title: string; date: string },
  context?: import("@/lib/task-hub/queries").EventTaskHubContext,
): Promise<TasksV2PageData> {
  const [hubData, viewer] = await Promise.all([
    getTaskHubPageDataForEvent(eventId, eventMeta, context),
    resolveTasksV2Viewer(),
  ]);
  const allTasks = flattenCommitteeTasks(hubData.committees);
  const eventGroups = groupTasksByEvent(allTasks);
  const summary = computeTasksV2SummaryStats(allTasks);
  const aiStatus = getAiAssistantStatus();

  return {
    ...hubData,
    eventGroups,
    summary,
    aiAvailable: aiStatus.available,
    aiUnavailableReason: aiStatus.reason,
    viewer,
  };
}
