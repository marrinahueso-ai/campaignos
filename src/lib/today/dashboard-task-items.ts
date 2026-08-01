import "server-only";

import { cache } from "react";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import { getTaskHubPageData } from "@/lib/task-hub/queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2Viewer } from "@/types/tasks-v2";

async function resolveDashboardTasksViewer(): Promise<TasksV2Viewer> {
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
 * Lean task list for Dashboard widgets — no Monday, no AI status / summary DTO.
 * Task rows already omit note bodies at the SQL select.
 */
export const getDashboardTaskItems = cache(
  async function getDashboardTaskItems(): Promise<{
    tasks: TaskHubTaskItem[];
    viewer: TasksV2Viewer;
  }> {
    const [hubData, viewer] = await Promise.all([
      getTaskHubPageData({ includeMonday: false }),
      resolveDashboardTasksViewer(),
    ]);
    return {
      tasks: flattenCommitteeTasks(hubData.committees),
      viewer,
    };
  },
);
