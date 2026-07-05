import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getEventById } from "@/lib/events/queries";
import { getEventPlaybookEvents } from "@/lib/event-playbooks/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  resolveTaskHubViewScope,
  resolveVisibleCommittees,
  type TaskHubUserContext,
} from "@/lib/task-hub/access";
import type { OrganizationCommittee } from "@/types/organization-workspace";
import type { TaskHubViewScope } from "@/types/task-hub";

export type TaskHubAccessResult =
  | {
      ok: true;
      organizationId: string;
      scope: TaskHubViewScope;
      committee: OrganizationCommittee | null;
    }
  | { ok: false; error: string };

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

export async function assertTaskHubEventAccess(
  eventId: string,
): Promise<TaskHubAccessResult> {
  const [organization, authUser, membership, campaignRole, event] =
    await Promise.all([
      getLatestOrganization(),
      getAuthUser(),
      getActiveMembership(),
      getCurrentCampaignRole(),
      getEventById(eventId),
    ]);

  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  const playbookEvents = await getEventPlaybookEvents(organization.id);

  if (!event || !playbookEvents.some((entry) => entry.id === eventId)) {
    return { ok: false, error: "Event not found." };
  }

  const workspace = await getOrganizationWorkspaceData(organization.id);
  if (!workspace) {
    return { ok: false, error: "Workspace not available." };
  }

  const user = buildUserContext(authUser, membership, campaignRole);
  const scope = resolveTaskHubViewScope(campaignRole);
  const visibleCommittees = resolveVisibleCommittees(workspace.committees, user);

  const ownershipMap = buildEventRosterOwnershipMap([event], workspace);
  const ownership = ownershipMap.get(event.id);
  const committeeName = ownership?.committeeName;

  let committee: OrganizationCommittee | null = null;
  if (committeeName) {
    committee =
      workspace.committees.find(
        (entry) => entry.name.toLowerCase() === committeeName.toLowerCase(),
      ) ?? null;
  }

  if (committee) {
    const allowed = visibleCommittees.some((entry) => entry.id === committee!.id);
    if (!allowed) {
      return { ok: false, error: "You do not have access to this committee." };
    }
  } else if (scope === "chaired_committees") {
    return { ok: false, error: "You do not have access to unassigned tasks." };
  }

  return {
    ok: true,
    organizationId: organization.id,
    scope,
    committee,
  };
}
