import "server-only";

import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import { filterTasksForMyView } from "@/lib/tasks-v2/my-tasks-filter";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";
import type { TodayAttentionCounts } from "@/types/today";

export async function getTodayAttentionCounts(): Promise<TodayAttentionCounts> {
  const [approvals, volunteers, tasksPage] = await Promise.all([
    getApprovalQueueOverviewForCurrentUser(undefined, {
      enrichPreviews: false,
    }),
    getVolunteersMasterPageData(),
    getTasksV2PageData(),
  ]);

  const allTasks = flattenCommitteeTasks(tasksPage.committees);
  const tasksThisWeek = filterTasksForMyView(
    allTasks,
    tasksPage.viewer,
    "this_week",
  );

  return {
    reviewCount: approvals.assignedToMe.length,
    volunteerCount: volunteers.underfilledRoleCount,
    tasksThisWeekCount: tasksThisWeek.length,
  };
}
