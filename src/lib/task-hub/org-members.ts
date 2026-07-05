import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";
import type { TaskHubOrgMember } from "@/types/task-hub";

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

function formatEmailAsName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._+-]+/g, " ").trim();
}

export function buildTaskHubOrgMembers(
  workspace: OrganizationWorkspaceData,
  users: OrganizationUser[],
): TaskHubOrgMember[] {
  const seen = new Set<string>();
  const members: TaskHubOrgMember[] = [];

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    members.push({
      id: key,
      displayName: trimmed,
      initials: deriveInitials(trimmed),
    });
  }

  for (const role of workspace.roles) {
    if (role.contactName?.trim()) {
      add(role.contactName);
    }
  }

  for (const committee of workspace.committees) {
    if (committee.contactName?.trim()) {
      for (const chair of parseCommitteeChairNames(committee.contactName)) {
        add(chair);
      }
    }
  }

  for (const user of users) {
    if (user.status !== "active") {
      continue;
    }
    add(formatEmailAsName(user.email));
    if (user.organizationRoleName?.trim()) {
      add(user.organizationRoleName);
    }
  }

  return members.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
