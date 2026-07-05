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
  type TaskHubUserContext,
} from "@/lib/task-hub/access";
import { groupTasksByCommittee } from "@/lib/task-hub/group-tasks";
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

  const events = await getEventPlaybookEvents(organization.id);
  const eventIds = events.map((event) => event.id);
  const taskRows = await getEventPlaybookTasksForEvents(eventIds);

  const committees = groupTasksByCommittee({
    events,
    taskRows,
    workspace,
    visibleCommittees,
  });

  const totalTasks = committees.reduce((sum, group) => sum + group.totalCount, 0);
  const openTasks = committees.reduce(
    (sum, group) => sum + group.totalCount - group.doneCount,
    0,
  );

  return {
    scope,
    scopeLabel,
    committees,
    tablesAvailable,
    totalTasks,
    openTasks,
  };
}
