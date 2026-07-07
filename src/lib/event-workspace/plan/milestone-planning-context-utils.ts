import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

export interface MilestonePlanningVpRoleOption {
  id: string;
  name: string;
  contactName: string | null;
}

export function buildVpRoleOptions(
  roles: OrganizationRole[],
): MilestonePlanningVpRoleOption[] {
  return roles
    .filter((role) => role.roleKind === "vp")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((role) => ({
      id: role.id,
      name: role.name,
      contactName: role.contactName,
    }));
}

export function resolveDefaultVpRoleId(
  ownership: EventRosterOwnership,
  vpRoles: MilestonePlanningVpRoleOption[],
): string {
  if (ownership.vpRoleName) {
    const match = vpRoles.find(
      (role) => role.name.toLowerCase() === ownership.vpRoleName!.toLowerCase(),
    );
    if (match) {
      return match.id;
    }
  }

  return vpRoles[0]?.id ?? "";
}

export function buildCommitteePersonOptions(
  ownership: EventRosterOwnership,
  committees: OrganizationCommittee[],
): string[] {
  const names = new Set<string>();

  for (const name of ownership.chairNames) {
    names.add(name);
  }

  for (const committee of committees) {
    for (const name of parseCommitteeChairNames(committee.contactName)) {
      names.add(name);
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

export function resolveDefaultCommitteePerson(
  eventOwner: string | null,
  ownership: EventRosterOwnership,
  options: string[],
): string {
  const trimmedOwner = eventOwner?.trim();
  if (trimmedOwner) {
    return trimmedOwner;
  }

  return ownership.chairNames[0] ?? options[0] ?? "";
}

export function formatVpRoleLabel(role: MilestonePlanningVpRoleOption): string {
  if (role.contactName?.trim()) {
    return `${role.name} · ${role.contactName.trim()}`;
  }

  return role.name;
}

export function withCommitteePersonOption(
  options: string[],
  selected: string,
): string[] {
  const trimmed = selected.trim();
  if (!trimmed || options.includes(trimmed)) {
    return options;
  }

  return [trimmed, ...options];
}
