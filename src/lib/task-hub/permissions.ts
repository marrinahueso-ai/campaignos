import "server-only";

import {
  accessHasPermission,
  canAccessEvent,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { getEventById } from "@/lib/events/queries";
import { getEventPlaybookEvents } from "@/lib/event-playbooks/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { resolveTaskHubViewScope } from "@/lib/task-hub/access";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
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

/**
 * Event-scoped task mutations: active org + EffectiveAccess canAccessEvent.
 * Committee-chair gating removed — assignment/access templates own visibility.
 */
export async function assertTaskHubEventAccess(
  eventId: string,
): Promise<TaskHubAccessResult> {
  const [organization, event, access, campaignRole] = await Promise.all([
    getLatestOrganization(),
    getEventById(eventId),
    getEffectiveAccess(),
    getCurrentCampaignRole(),
  ]);

  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  if (!access) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }

  if (!canAccessEvent(access, eventId)) {
    return { ok: false, error: "You do not have access to this event." };
  }

  if (!accessHasPermission(access, "draft_edit")) {
    return { ok: false, error: "You do not have permission to edit tasks." };
  }

  const playbookEvents = await getEventPlaybookEvents(organization.id);

  if (!event || !playbookEvents.some((entry) => entry.id === eventId)) {
    return { ok: false, error: "Event not found." };
  }

  return {
    ok: true,
    organizationId: organization.id,
    scope: resolveTaskHubViewScope(campaignRole),
    committee: null,
  };
}
