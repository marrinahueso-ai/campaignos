import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { applySafetyLocks } from "@/lib/access-templates/defaults";
import {
  accessHasPermission,
  resolveTemplateForAccess,
  type EffectiveAccess,
} from "@/lib/access-templates/effective-access-core";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import type { AccessPermissionKey } from "@/lib/access-templates/types";
import { listOrganizationUserEventIds } from "@/lib/auth/event-assignments";
import { isCampaignRole } from "@/lib/auth/campaign-roles";
import { SIMULATED_ROLE_COOKIE } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";

export type { EffectiveAccess };
export {
  accessHasPermission,
  canAccessEvent,
  filterEventsByAccess,
  resolveTemplateForAccess,
} from "@/lib/access-templates/effective-access-core";

export const getEffectiveAccess = cache(
  async (): Promise<EffectiveAccess | null> => {
    const membership = await getActiveMembership();
    if (!membership) {
      return null;
    }

    const cookieStore = await cookies();
    const simulated = cookieStore.get(SIMULATED_ROLE_COOKIE)?.value;

    const templateId =
      simulated && isCampaignRole(simulated)
        ? simulated
        : (membership.user.accessTemplateId ?? membership.user.campaignRole);

    const templates = await getOrganizationAccessTemplates(
      membership.organizationId,
    );
    const template = resolveTemplateForAccess(
      templates,
      templateId,
      membership.user.campaignRole,
    );

    const permissions = applySafetyLocks(
      template.id,
      template.permissions,
      template.baseRole,
    );

    const assignedEventIds = await listOrganizationUserEventIds(
      membership.user.id,
    );

    return {
      organizationId: membership.organizationId,
      membershipId: membership.user.id,
      email: membership.user.email,
      templateId: template.id,
      baseRole: template.baseRole,
      permissions,
      assignedEventIds,
      viewAssignedEventsOnly: permissions.view_assigned_events_only,
    };
  },
);

export async function hasPermission(
  key: AccessPermissionKey,
): Promise<boolean> {
  const access = await getEffectiveAccess();
  if (!access) {
    return false;
  }
  return accessHasPermission(access, key);
}

export async function requirePermission(
  key: AccessPermissionKey,
): Promise<EffectiveAccess | { error: string }> {
  const access = await getEffectiveAccess();
  if (!access) {
    return { error: "Sign in and set up your organization first." };
  }
  if (!accessHasPermission(access, key)) {
    return { error: "You do not have permission to perform this action." };
  }
  return access;
}
