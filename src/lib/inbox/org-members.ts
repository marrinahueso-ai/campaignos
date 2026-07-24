import { deriveInitials } from "@/lib/task-hub/org-members";
import type { InboxOrgMember } from "@/lib/inbox/types";
import type { OrganizationUser } from "@/types/auth";

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

/** Active org login members with auth user ids — for conversation assignment. */
export function buildInboxOrgMembers(users: OrganizationUser[]): InboxOrgMember[] {
  const members: InboxOrgMember[] = [];

  for (const user of users) {
    if (user.status !== "active" || !user.userId) {
      continue;
    }
    const displayName = resolveMemberDisplayName(user);
    members.push({
      id: user.id,
      userId: user.userId,
      displayName,
      initials: deriveInitials(displayName),
    });
  }

  return members.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
