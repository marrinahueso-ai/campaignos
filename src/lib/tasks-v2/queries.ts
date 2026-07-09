import "server-only";

import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import { getTaskHubPageData } from "@/lib/task-hub/queries";
import { computeTasksV2SummaryStats } from "@/lib/tasks-v2/summary-stats";
import { groupTasksByEvent } from "@/lib/tasks-v2/group-by-event";
import type { TasksV2PageData } from "@/types/tasks-v2";

export async function getTasksV2PageData(): Promise<TasksV2PageData> {
  const hubData = await getTaskHubPageData();
  const allTasks = flattenCommitteeTasks(hubData.committees);
  const eventGroups = groupTasksByEvent(allTasks);
  const summary = computeTasksV2SummaryStats(allTasks);

  return {
    ...hubData,
    eventGroups,
    summary,
  };
}
