import "server-only";

import { cache } from "react";
import { getUnifiedApprovalsSchedulingDataLean } from "@/lib/approvals-scheduling/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getUpcomingEvents } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { listCommitteeAssignmentsByOrg } from "@/lib/organization-workspace/roster-assignments";
import { getOrganizationWorkspaceDataLeanWithAssignments } from "@/lib/organization-workspace/queries";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import { getDashboardTaskItems } from "@/lib/today/dashboard-task-items";
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

    const [unified, taskItems, upcomingEvents, workspace, committeeAssignments] =
      await Promise.all([
        getUnifiedApprovalsSchedulingDataLean(),
        getDashboardTaskItems(),
        getUpcomingEvents(24, organization?.id ?? null),
        organization
          ? getOrganizationWorkspaceDataLeanWithAssignments(organization.id)
          : Promise.resolve(null),
        organization
          ? listCommitteeAssignmentsByOrg(organization.id)
          : Promise.resolve([]),
      ]);

    const allTasks = taskItems.tasks;
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
