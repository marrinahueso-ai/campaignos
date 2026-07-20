import "server-only";

import {
  accessHasPermission,
  canAccessEvent,
  filterEventsByAccess,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookEvents,
  getEventPlaybookTasksForEvents,
} from "@/lib/event-playbooks/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  resolveTaskHubViewScope,
  taskHubScopeLabel,
} from "@/lib/task-hub/access";
import { groupTasksByCommittee } from "@/lib/task-hub/group-tasks";
import { buildTaskHubOrgMembers } from "@/lib/task-hub/org-members";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForOrganization,
} from "@/lib/monday/connection";
import { fetchMondayBoardForTaskHub } from "@/lib/monday/board-reader";
import { getMondayBoardDetails } from "@/lib/monday/client";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import { fetchMondayOverlaysForTasks } from "@/lib/monday/sync";
import type { TaskHubPageData } from "@/types/task-hub";

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

/** Events the user may see/work on for Tasks (access templates + Mode B list). */
function filterEventsForTaskHub<T extends { id: string }>(
  events: T[],
  access: Awaited<ReturnType<typeof getEffectiveAccess>>,
): T[] {
  if (!access) {
    return [];
  }

  const workAccessible = events.filter((event) => canAccessEvent(access, event.id));
  return filterEventsByAccess(access, workAccessible);
}

export type GetTaskHubPageDataOptions = {
  /** When true, load optional Monday board/overlays. Tasks v2 leaves this off. */
  includeMonday?: boolean;
};

export async function getTaskHubPageData(
  options: GetTaskHubPageDataOptions = {},
): Promise<TaskHubPageData> {
  const includeMonday = options.includeMonday === true;

  const [organization, campaignRole, tablesAvailable, access] = await Promise.all([
    getLatestOrganization(),
    getCurrentCampaignRole(),
    areEventPlaybookTablesAvailable(),
    getEffectiveAccess(),
  ]);

  const scope = resolveTaskHubViewScope(campaignRole);
  const scopeLabel = access?.accessAssignedEventsOnly
    ? "Assigned events"
    : "Accessible events";

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

  const canEdit = Boolean(access && accessHasPermission(access, "draft_edit"));

  const [allEvents, orgUsers] = await Promise.all([
    getEventPlaybookEvents(organization.id),
    getOrganizationUsers(organization.id),
  ]);
  const events = filterEventsForTaskHub(allEvents, access);
  const eventIds = events.map((event) => event.id);
  const taskRows =
    eventIds.length > 0
      ? await getEventPlaybookTasksForEvents(eventIds)
      : [];

  // All committees — visibility is event-access, not chair-of-committee.
  const committees = groupTasksByCommittee({
    events,
    taskRows,
    workspace,
    visibleCommittees: workspace.committees,
  });

  const orgMembers = buildTaskHubOrgMembers(workspace, orgUsers);

  let mondaySyncEnabled = false;
  let mondayBoard = null;

  if (includeMonday && isMondayIntegrationEnabled()) {
    const [mondayConnection, mondayMapping] = await Promise.all([
      getMondayConnectionForOrganization(organization.id),
      getMondayBoardMappingForOrganization(organization.id),
    ]);
    mondaySyncEnabled = Boolean(
      mondayConnection?.mondaySyncEnabled && mondayMapping?.columnMap.statusColumnId,
    );

    if (mondaySyncEnabled && mondayConnection && mondayMapping) {
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
          visibleCommitteeNames: null,
        });
      } catch (error) {
        console.error("Failed to load Monday board for Task Hub:", error);
      }

      if (!mondayBoard) {
        const allTaskIds = committees.flatMap((group) =>
          group.tasks.map((task) => task.id),
        );
        const overlays = await fetchMondayOverlaysForTasks({
          organizationId: organization.id,
          taskIds: allTaskIds,
          columnMap: mondayMapping.columnMap,
          accountSlug: mondayConnection.accountSlug,
        });

        for (const group of committees) {
          group.tasks = group.tasks.map((task) => ({
            ...task,
            monday: overlays.get(task.id) ?? null,
          }));
        }
      }
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
    canEdit,
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
 * No org workspace, unrelated events, or Monday board.
 */
export async function getTaskHubPageDataForEvent(
  eventId: string,
  eventMeta: { title: string; date: string },
  context?: EventTaskHubContext,
): Promise<TaskHubPageData> {
  const [campaignRole, tablesAvailable, access] = await Promise.all([
    context?.campaignRole
      ? Promise.resolve(context.campaignRole)
      : getCurrentCampaignRole(),
    context?.tablesAvailable !== undefined
      ? Promise.resolve(context.tablesAvailable)
      : areEventPlaybookTablesAvailable(),
    getEffectiveAccess(),
  ]);

  const scope = resolveTaskHubViewScope(campaignRole);
  const scopeLabel = taskHubScopeLabel(scope);

  if (!tablesAvailable) {
    return emptyTaskHubPage(scopeLabel, false);
  }

  if (access && !canAccessEvent(access, eventId)) {
    return emptyTaskHubPage("Assigned events", tablesAvailable);
  }

  const canEdit = Boolean(
    access &&
      accessHasPermission(access, "draft_edit") &&
      canAccessEvent(access, eventId),
  );

  const organization = await getLatestOrganization();
  const [taskRows, orgUsers, workspace] = await Promise.all([
    getEventPlaybookTasksForEvents([eventId]),
    organization
      ? getOrganizationUsers(organization.id)
      : Promise.resolve([]),
    organization
      ? getOrganizationWorkspaceData(organization.id)
      : Promise.resolve(null),
  ]);
  const { mapEventPlaybookTaskRow } = await import(
    "@/lib/event-playbooks/mappers"
  );

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

  const orgMembers = workspace
    ? buildTaskHubOrgMembers(workspace, orgUsers)
    : [];

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
    canEdit,
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
