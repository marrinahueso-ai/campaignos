import {
  getDefaultAccessTemplate,
} from "@/lib/access-templates/defaults";
import { findAccessTemplate } from "@/lib/access-templates/merge";
import type {
  AccessPermissionKey,
  AccessTemplate,
  AccessTemplatePermissions,
} from "@/lib/access-templates/types";
import { isCustomAccessTemplateId } from "@/lib/access-templates/types";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";

export interface EffectiveAccess {
  organizationId: string;
  membershipId: string;
  email: string;
  templateId: string;
  baseRole: CampaignRole;
  permissions: AccessTemplatePermissions;
  assignedEventIds: string[];
  /** Mode B: hide unassigned cards from event lists. */
  viewAssignedEventsOnly: boolean;
  /** Mode A or B: deny open/edit/mutations on unassigned events. */
  accessAssignedEventsOnly: boolean;
}

/** Pure resolution used by getEffectiveAccess and unit tests. */
export function resolveTemplateForAccess(
  templates: AccessTemplate[],
  templateId: string | null | undefined,
  campaignRoleFallback: CampaignRole,
): AccessTemplate {
  const preferredId = templateId?.trim() || campaignRoleFallback;
  const found = findAccessTemplate(templates, preferredId);
  if (found) {
    return found;
  }
  // Deleted/missing custom templates must fail closed — never inherit the
  // member's campaignRole defaults (that was a privilege escalation).
  if (isCustomAccessTemplateId(preferredId)) {
    return getDefaultAccessTemplate("view_only");
  }
  if (isCampaignRole(preferredId)) {
    return getDefaultAccessTemplate(preferredId);
  }
  return getDefaultAccessTemplate(campaignRoleFallback);
}

export function accessHasPermission(
  access: EffectiveAccess,
  key: AccessPermissionKey,
): boolean {
  return Boolean(access.permissions[key]);
}

export function canAccessEvent(
  access: EffectiveAccess,
  eventId: string,
): boolean {
  if (!access.accessAssignedEventsOnly) {
    return true;
  }
  return access.assignedEventIds.includes(eventId);
}

export function filterEventsByAccess<T extends { id: string }>(
  access: EffectiveAccess | null | undefined,
  events: T[],
): T[] {
  // List filtering is Mode B only (hide unassigned cards).
  if (!access?.viewAssignedEventsOnly) {
    return events;
  }
  const allowed = new Set(access.assignedEventIds);
  return events.filter((event) => allowed.has(event.id));
}
