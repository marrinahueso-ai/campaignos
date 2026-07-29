import "server-only";

import { cache } from "react";
import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getUpcomingEvents } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { listCommitteeAssignmentsByOrg } from "@/lib/organization-workspace/roster-assignments";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { flattenCommitteeTasks } from "@/lib/task-hub/grouping";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import {
  buildEventCoverageItems,
  buildPostsWeekEveryoneCounts,
  buildPostsWeekMineItems,
  buildWaitingOnOthersEveryoneCounts,
  buildWaitingOnOthersMineItems,
  type DashboardLibraryWidgetData,
} from "@/lib/today/dashboard-library-widget-filters";

export type {
  DashboardEventCoverageItem,
  DashboardLibraryWidgetData,
  DashboardPostWeekItem,
  DashboardPostsWeekEveryoneData,
  DashboardPostWeekStatus,
  DashboardWaitingOnOthersEveryoneData,
  DashboardWaitingOnOthersItem,
  DashboardWidgetLens,
  EventCoverageStatus,
} from "@/lib/today/dashboard-library-widget-filters";

export {
  buildEventCoverageItems,
  buildPostsWeekEveryoneCounts,
  buildWaitingOnOthersEveryoneCounts,
  derivePostWeekStatus,
  filterPostsWeekMine,
  filterPostsWeekScheduledThisWeek,
  filterWaitingOnOthersMine,
  isDateInWeek,
} from "@/lib/today/dashboard-library-widget-filters";

export const getDashboardLibraryWidgetData = cache(
  async function getDashboardLibraryWidgetData(): Promise<DashboardLibraryWidgetData> {
    const today = getTodayDateString();
    const weekEnd = addDaysToDateOnly(today, 7);
    const organization = await getLatestOrganization();
    const membership = await getActiveMembership();

    const [unified, tasksPage, upcomingEvents, workspace, committeeAssignments] =
      await Promise.all([
        getUnifiedApprovalsSchedulingData(),
        getTasksV2PageData(),
        getUpcomingEvents(24, organization?.id ?? null),
        organization
          ? getOrganizationWorkspaceData(organization.id)
          : Promise.resolve(null),
        organization
          ? listCommitteeAssignmentsByOrg(organization.id)
          : Promise.resolve([]),
      ]);

    const allTasks = flattenCommitteeTasks(tasksPage.committees);
    const actorUserId = unified.actorUserId ?? membership?.user.id ?? null;

    const eventCoverage =
      workspace && organization
        ? buildEventCoverageItems({
            events: upcomingEvents,
            today,
            committees: workspace.committees,
            members: workspace.members,
            committeeAssignments,
          })
        : [];

    return {
      postsWeek: {
        mine: buildPostsWeekMineItems(
          unified.items,
          actorUserId,
          today,
          weekEnd,
        ),
        everyone: buildPostsWeekEveryoneCounts(unified.items, today, weekEnd),
      },
      waitingOthers: {
        mine: buildWaitingOnOthersMineItems(unified.items, today),
        everyone: buildWaitingOnOthersEveryoneCounts({
          approvals: unified.items,
          tasks: allTasks,
          viewerUserId: actorUserId,
          today,
        }),
      },
      eventCoverage,
    };
  },
);
