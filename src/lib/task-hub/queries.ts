import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookEvents,
  getEventPlaybookTasksForEvents,
} from "@/lib/event-playbooks/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  resolveTaskHubViewScope,
  resolveVisibleCommittees,
  taskHubScopeLabel,
  canEditTaskHub,
  type TaskHubUserContext,
} from "@/lib/task-hub/access";
import { groupTasksByCommittee } from "@/lib/task-hub/group-tasks";
import { buildTaskHubOrgMembers } from "@/lib/task-hub/org-members";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForOrganization,
} from "@/lib/monday/connection";
import { fetchMondayBoardForTaskHub } from "@/lib/monday/board-reader";
import { getMondayBoardDetails } from "@/lib/monday/client";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import { fetchMondayOverlaysForTasks } from "@/lib/monday/sync";
import type { TaskHubPageData } from "@/types/task-hub";

function buildUserContext(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  membership: Awaited<ReturnType<typeof getActiveMembership>>,
  campaignRole: Awaited<ReturnType<typeof getCurrentCampaignRole>>,
): TaskHubUserContext {
  return {
    campaignRole,
    displayName: authUser?.displayName ?? null,
    email: authUser?.email ?? membership?.user.email ?? null,
  };
}

function emptyTaskHubPage(scopeLabel: string, tablesAvailable: boolean): TaskHubPageData {
  return {
    scope: "chaired_committees",
    scopeLabel,
    committees: [],
    tablesAvailable,
    totalTasks: 0,
    openTasks: 0,
    mondaySyncEnabled: false,
    mondayBoard: null,
    canEdit: false,
    orgMembers: [],
    events: [],
  };
}

export async function getTaskHubPageData(): Promise<TaskHubPageData> {
  const [organization, authUser, membership, campaignRole, tablesAvailable] =
    await Promise.all([
      getLatestOrganization(),
      getAuthUser(),
      getActiveMembership(),
      getCurrentCampaignRole(),
      areEventPlaybookTablesAvailable(),
    ]);

  const scope = resolveTaskHubViewScope(campaignRole);
  const scopeLabel = taskHubScopeLabel(scope);

  if (!organization) {
    return emptyTaskHubPage(scopeLabel, tablesAvailable);
  }

  if (!tablesAvailable) {
    return emptyTaskHubPage(scopeLabel, false);
  }

  const workspace = await getOrganizationWorkspaceData(organization.id);
  if (!workspace) {
    return emptyTaskHubPage(scopeLabel, tablesAvailable);
  }

  const user = buildUserContext(authUser, membership, campaignRole);
  const visibleCommittees = resolveVisibleCommittees(workspace.committees, user);

  const [events, orgUsers] = await Promise.all([
    getEventPlaybookEvents(organization.id),
    getOrganizationUsers(organization.id),
  ]);
  const eventIds = events.map((event) => event.id);
  const taskRows = await getEventPlaybookTasksForEvents(eventIds);

  const committees = groupTasksByCommittee({
    events,
    taskRows,
    workspace,
    visibleCommittees,
  });

  const orgMembers = buildTaskHubOrgMembers(workspace, orgUsers);

  const mondayIntegrationEnabled = isMondayIntegrationEnabled();
  const mondayConnectionPromise = mondayIntegrationEnabled
    ? getMondayConnectionForOrganization(organization.id)
    : Promise.resolve(null);
  const mondayMappingPromise = mondayIntegrationEnabled
    ? getMondayBoardMappingForOrganization(organization.id)
    : Promise.resolve(null);

  const [mondayConnection, mondayMapping] = await Promise.all([
    mondayConnectionPromise,
    mondayMappingPromise,
  ]);
  const mondaySyncEnabled =
    mondayIntegrationEnabled &&
    Boolean(mondayConnection?.mondaySyncEnabled && mondayMapping?.columnMap.statusColumnId);

  let mondayBoard = null;
  if (mondaySyncEnabled && mondayConnection && mondayMapping) {
    const visibleCommitteeNames =
      scope === "all_committees"
        ? null
        : visibleCommittees.map((committee) => committee.name);

    try {
      const boardDetails = await getMondayBoardDetails(
        mondayConnection.accessToken,
        mondayMapping.mondayBoardId,
      );
      mondayBoard = await fetchMondayBoardForTaskHub({
        accessToken: mondayConnection.accessToken,
        boardId: mondayMapping.mondayBoardId,
        boardName: boardDetails?.name ?? "Monday board",
        columnMap: mondayMapping.columnMap,
        accountSlug: mondayConnection.accountSlug,
        events,
        visibleCommitteeNames,
      });
    } catch (error) {
      console.error("Failed to load Monday board for Task Hub:", error);
    }
  }

  if (mondaySyncEnabled && !mondayBoard) {
    const allTaskIds = committees.flatMap((group) => group.tasks.map((task) => task.id));
    const overlays = await fetchMondayOverlaysForTasks({
      organizationId: organization.id,
      taskIds: allTaskIds,
      columnMap: mondayMapping?.columnMap ?? null,
      accountSlug: mondayConnection?.accountSlug ?? null,
    });

    for (const group of committees) {
      group.tasks = group.tasks.map((task) => ({
        ...task,
        monday: overlays.get(task.id) ?? null,
      }));
    }
  }

  const eventOptions: TaskHubPageData["events"] = events.map((event) => ({
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.date,
  }));

  const totalTasks = mondayBoard
    ? mondayBoard.groups.reduce(
        (sum, group) =>
          sum + group.items.reduce((itemSum, item) => itemSum + item.subitems.length, 0),
        0,
      )
    : committees.reduce((sum, group) => sum + group.totalCount, 0);

  const openTasks = mondayBoard
    ? mondayBoard.groups.reduce(
        (sum, group) =>
          sum +
          group.items.reduce(
            (itemSum, item) =>
              itemSum +
              item.subitems.filter(
                (sub) =>
                  !sub.columnValues.status ||
                  !/done|complete/i.test(sub.columnValues.status),
              ).length,
            0,
          ),
        0,
      )
    : committees.reduce(
        (sum, group) =>
          sum + group.tasks.filter((task) => isOpenTaskStatus(task.status)).length,
        0,
      );

  return {
    scope,
    scopeLabel,
    committees,
    tablesAvailable,
    totalTasks,
    openTasks,
    mondaySyncEnabled,
    mondayBoard,
    canEdit: canEditTaskHub(scope),
    orgMembers,
    events: eventOptions,
  };
}

export type EventTaskHubContext = {
  campaignRole: Awaited<ReturnType<typeof getCurrentCampaignRole>>;
  tablesAvailable: boolean;
};

/**
 * Event Detail Tasks tab — exact eventId tasks only.
 * No org workspace, org users, unrelated events, or Monday board.
 */
export async function getTaskHubPageDataForEvent(
  eventId: string,
  eventMeta: { title: string; date: string },
  context?: EventTaskHubContext,
): Promise<TaskHubPageData> {
  const [campaignRole, tablesAvailable] = await Promise.all([
    context?.campaignRole
      ? Promise.resolve(context.campaignRole)
      : getCurrentCampaignRole(),
    context?.tablesAvailable !== undefined
      ? Promise.resolve(context.tablesAvailable)
      : areEventPlaybookTablesAvailable(),
  ]);

  const scope = resolveTaskHubViewScope(campaignRole);
  const scopeLabel = taskHubScopeLabel(scope);

  if (!tablesAvailable) {
    return emptyTaskHubPage(scopeLabel, false);
  }

  const taskRows = await getEventPlaybookTasksForEvents([eventId]);
  const { mapEventPlaybookTaskRow } = await import(
    "@/lib/event-playbooks/mappers"
  );
  const { deriveInitials } = await import("@/lib/task-hub/org-members");

  const eventContext = {
    eventId,
    eventTitle: eventMeta.title,
    eventDate: eventMeta.date,
    eventHref: `/events/${eventId}?tab=tasks`,
  };

  const tasks = taskRows.map((row) => ({
    ...mapEventPlaybookTaskRow(row),
    event: eventContext,
    monday: null,
  }));

  const assigneeMap = new Map<string, { id: string; displayName: string; initials: string }>();
  for (const task of tasks) {
    const name = task.assigneeName?.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, {
        id: key,
        displayName: name,
        initials: task.assigneeInitials?.trim() || deriveInitials(name),
      });
    }
  }
  const orgMembers = [...assigneeMap.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );

  const doneCount = tasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.filter((task) => isOpenTaskStatus(task.status)).length;

  const committees = [
    {
      committeeId: null,
      committeeName: "Event tasks",
      chairName: null,
      sortOrder: 0,
      tasks,
      events: [
        {
          eventId,
          eventTitle: eventMeta.title,
          eventDate: eventMeta.date,
        },
      ],
      doneCount,
      totalCount: tasks.length,
    },
  ];

  return {
    scope,
    scopeLabel,
    committees,
    tablesAvailable,
    totalTasks: tasks.length,
    openTasks,
    mondaySyncEnabled: false,
    mondayBoard: null,
    canEdit: canEditTaskHub(scope),
    orgMembers,
    events: [
      {
        eventId,
        eventTitle: eventMeta.title,
        eventDate: eventMeta.date,
      },
    ],
  };
}
