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
  return local
    .replace(/[._+-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveMemberDisplayName(user: OrganizationUser): string {
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }
  return formatEmailAsName(user.email);
}

/**
 * Active org login members for task assignment.
 * Prefer real auth user ids so My Tasks can match reliably.
 */
export function buildTaskHubOrgMembers(
  _workspace: OrganizationWorkspaceData,
  users: OrganizationUser[],
): TaskHubOrgMember[] {
  const members: TaskHubOrgMember[] = [];

  for (const user of users) {
    if (user.status !== "active") {
      continue;
    }
    const displayName = resolveMemberDisplayName(user);
    members.push({
      id: user.id,
      userId: user.userId,
      displayName,
      initials: deriveInitials(displayName),
      email: user.email,
    });
  }

  return members.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
