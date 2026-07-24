import "server-only";

import { cache } from "react";
import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";
import type { VolunteersMasterEventRow } from "@/lib/event-volunteers/org-master-shared";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import { filterTasksForMyView } from "@/lib/tasks-v2/my-tasks-filter";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";
import type { ApprovalQueueItem } from "@/types/event-workspace";
import type { TaskHubTaskItem } from "@/types/task-hub";

export type DashboardRichListData = {
  approvals: ApprovalQueueItem[];
  tasksThisWeek: TaskHubTaskItem[];
  underfilledEvents: VolunteersMasterEventRow[];
};

/**
 * Shared fetch for Attention counts + Phase 3 list widgets.
 * Cached per request so multiple widgets do not re-query.
 */
export const getDashboardRichListData = cache(
  async (): Promise<DashboardRichListData> => {
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
      approvals: approvals.assignedToMe,
      tasksThisWeek,
      underfilledEvents: volunteers.events.filter((event) => event.needsPeople),
    };
  },
);
