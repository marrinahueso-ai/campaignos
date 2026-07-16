import "server-only";

import { getAiAssistantStatus } from "@/lib/ai";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import {
  getTaskHubPageData,
  getTaskHubPageDataForEvent,
} from "@/lib/task-hub/queries";
import { computeTasksV2SummaryStats } from "@/lib/tasks-v2/summary-stats";
import { groupTasksByEvent } from "@/lib/tasks-v2/group-by-event";
import type { TasksV2PageData } from "@/types/tasks-v2";

export async function getTasksV2PageData(): Promise<TasksV2PageData> {
  const hubData = await getTaskHubPageData();
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
  };
}

/** Event Detail Tasks tab — exact-event tasks only, no Monday board. */
export async function getTasksV2PageDataForEvent(
  eventId: string,
  eventMeta: { title: string; date: string },
): Promise<TasksV2PageData> {
  const hubData = await getTaskHubPageDataForEvent(eventId, eventMeta);
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
  };
}
