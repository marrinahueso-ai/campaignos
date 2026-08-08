import {
  campaignRoleLabel,
  isCampaignRole,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { AccessTemplate } from "@/lib/access-templates/types";

/** Roles shown in the event invite drawer (Pilot-aligned; maps to CampaignRole). */
export const INVITE_EVENT_MEMBER_ROLE_IDS: CampaignRole[] = [
  "president",
  "vp_communications",
  "committee_chair",
  "contributor",
  "view_only",
];

export type InviteEventMemberRoleOption = {
  id: string;
  label: string;
  baseRole: CampaignRole;
};

export type InviteEventMemberLookup = {
  membershipId: string;
  email: string;
  displayName: string | null;
  campaignRole: CampaignRole;
  roleLabel: string;
  status: "active" | "invited" | "deactivated";
  assignedEventIds: string[];
  alreadyOnEvent: boolean;
};

export type InviteEventMemberSuccessKind = "invited" | "added";

/** Local Event page collaborator preview after invite/add (not a second membership model). */
export type EventInviteCollaboratorPreview = {
  id: string;
  displayName: string;
  roleLabel: string;
  status: "pending" | "active";
};

export type InviteEventMemberAddedResult = {
  kind: InviteEventMemberSuccessKind;
  displayName: string;
  roleLabel: string;
  email?: string;
};

export function isValidInviteEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateInviteEventMemberForm(input: {
  name: string;
  email: string;
  roleId: string;
}): string | null {
  if (!input.name.trim()) {
    return "Name is required.";
  }
  if (!input.email.trim()) {
    return "Email is required.";
  }
  if (!isValidInviteEmail(input.email)) {
    return "Enter a valid email address.";
  }
  if (!input.roleId.trim()) {
    return "Select a role.";
  }
  return null;
}

/**
 * Build role options from org templates when present; otherwise canonical campaign roles.
 * Excludes developer/tester from the customer invite drawer.
 */
export function buildInviteEventMemberRoleOptions(
  accessTemplates: AccessTemplate[] = [],
): InviteEventMemberRoleOption[] {
  const customerTemplates = accessTemplates.filter(
    (template) =>
      INVITE_EVENT_MEMBER_ROLE_IDS.includes(template.baseRole) &&
      template.baseRole !== "developer" &&
      template.baseRole !== "tester",
  );

  if (customerTemplates.length > 0) {
    const seen = new Set<string>();
    const options: InviteEventMemberRoleOption[] = [];
    for (const roleId of INVITE_EVENT_MEMBER_ROLE_IDS) {
      const matches = customerTemplates.filter(
        (template) => template.baseRole === roleId,
      );
      for (const template of matches) {
        if (seen.has(template.id)) continue;
        seen.add(template.id);
        options.push({
          id: template.id,
          label: template.displayName,
          baseRole: template.baseRole,
        });
      }
    }
    if (options.length > 0) {
      return options;
    }
  }

  return INVITE_EVENT_MEMBER_ROLE_IDS.map((role) => ({
    id: role,
    label: campaignRoleLabel(role),
    baseRole: role,
  }));
}

export function mapSelectedRoleToCampaignRole(
  roleId: string,
  options: InviteEventMemberRoleOption[],
): CampaignRole | null {
  const matched = options.find((option) => option.id === roleId);
  if (matched) return matched.baseRole;
  if (isCampaignRole(roleId)) return roleId;
  return null;
}

export function mergeEventAssignmentIds(
  existingEventIds: string[],
  eventId: string,
): string[] {
  const next = new Set(
    existingEventIds.map((id) => id.trim()).filter(Boolean),
  );
  const trimmed = eventId.trim();
  if (trimmed) {
    next.add(trimmed);
  }
  return Array.from(next);
}

export function inviteMemberInitials(name: string, email: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length > 0) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const local = email.trim().split("@")[0] ?? "";
  return (local.slice(0, 2) || "?").toUpperCase();
}

export function formatInviteEventContextDate(date: string): string {
  const [yearText, monthText, dayText] = date.split("T")[0]!.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
