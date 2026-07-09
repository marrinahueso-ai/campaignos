import {
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import { deriveInitials } from "@/lib/task-hub/org-members";
import type { OrganizationUser } from "@/types/auth";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

export type CommitteeStatus = "on_track" | "needs_attention" | "open_role";

export interface UnifiedTeamMember {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  roleLabel: string;
  accessLabel: string;
  accessLevel: CampaignRole;
  committeeCount: number;
  committees: MemberCommitteeAssignment[];
  status: OrganizationUser["status"];
  lastActive: string | null;
  joinedAt: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  reportsTo: string | null;
  teamMemberCount: number;
  isVp: boolean;
  raw: OrganizationUser;
}

export interface MemberCommitteeAssignment {
  committee: OrganizationCommittee;
  roleOnCommittee: "vp" | "chair" | "co_chair" | "member";
  status: CommitteeStatus;
  openTasks: number;
  campaigns: number;
  approvals: number;
}

function normalizePersonToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function personTokensMatch(a: string, b: string): boolean {
  const normA = normalizePersonToken(a);
  const normB = normalizePersonToken(b);

  if (!normA || !normB) {
    return false;
  }

  if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
    return true;
  }

  const firstA = normA.split(/\s+/)[0] ?? "";
  const firstB = normB.split(/\s+/)[0] ?? "";

  return firstA.length > 2 && firstA === firstB;
}

function formatEmailAsName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._+-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function accessLevelLabel(role: CampaignRole): string {
  switch (role) {
    case "admin":
      return "Full Access";
    case "president":
    case "vp_communications":
      return "Admin";
    case "committee_chair":
    case "contributor":
      return "Editor";
    case "view_only":
      return "Viewer";
    default:
      return campaignRoleLabel(role);
  }
}

export function accessBadgeVariant(
  role: CampaignRole,
): "success" | "info" | "warning" | "default" {
  switch (role) {
    case "admin":
      return "success";
    case "president":
    case "vp_communications":
      return "info";
    case "committee_chair":
    case "contributor":
      return "warning";
    default:
      return "default";
  }
}

function resolveDisplayName(
  user: OrganizationUser,
  workspace: OrganizationWorkspaceData,
): string {
  const emailLower = user.email.toLowerCase();

  for (const member of workspace.members) {
    if (member.email?.toLowerCase() === emailLower && member.name?.trim()) {
      return member.name.trim();
    }
  }

  for (const role of workspace.roles) {
    if (role.contactEmail?.toLowerCase() === emailLower && role.contactName?.trim()) {
      return role.contactName.trim();
    }
  }

  for (const committee of workspace.committees) {
    if (committee.contactEmail?.toLowerCase() === emailLower) {
      const chairs = parseCommitteeChairNames(committee.contactName);
      if (chairs[0]) {
        return chairs[0];
      }
    }
  }

  return formatEmailAsName(user.email);
}

function userMatchesPerson(
  displayName: string,
  email: string,
  personName: string,
): boolean {
  if (personTokensMatch(displayName, personName)) {
    return true;
  }
  if (personTokensMatch(email, personName)) {
    return true;
  }
  const emailLocal = email.split("@")[0]?.trim() ?? "";
  if (
    emailLocal &&
    normalizePersonToken(personName).replace(/\s+/g, "").includes(emailLocal)
  ) {
    return true;
  }
  return false;
}

function resolveCommitteeStatus(committee: OrganizationCommittee): CommitteeStatus {
  const chairs = parseCommitteeChairNames(committee.contactName);
  if (chairs.length === 0) {
    return "open_role";
  }
  if (!committee.parentRoleId) {
    return "needs_attention";
  }
  return "on_track";
}

function getMemberCommittees(
  user: OrganizationUser,
  displayName: string,
  workspace: OrganizationWorkspaceData,
): MemberCommitteeAssignment[] {
  const assignments: MemberCommitteeAssignment[] = [];

  for (const committee of workspace.committees) {
    let roleOnCommittee: MemberCommitteeAssignment["roleOnCommittee"] | null = null;

    if (user.organizationRoleId && committee.parentRoleId === user.organizationRoleId) {
      roleOnCommittee = "vp";
    }

    const chairs = parseCommitteeChairNames(committee.contactName);
    for (let i = 0; i < chairs.length; i++) {
      const chairName = chairs[i];
      if (chairName && userMatchesPerson(displayName, user.email, chairName)) {
        roleOnCommittee = i === 0 ? "chair" : "co_chair";
        break;
      }
    }

    if (roleOnCommittee) {
      assignments.push({
        committee,
        roleOnCommittee,
        status: resolveCommitteeStatus(committee),
        openTasks: 0,
        campaigns: 0,
        approvals: 0,
      });
    }
  }

  return assignments;
}

function resolveReportsTo(
  user: OrganizationUser,
  workspace: OrganizationWorkspaceData,
): string | null {
  if (user.campaignRole === "president" || user.campaignRole === "admin") {
    return null;
  }

  const president = workspace.roles.find((role) => role.roleKind === "president");
  if (president?.contactName?.trim()) {
    return `${president.contactName.trim()}, President`;
  }
  if (president?.name) {
    return president.name;
  }

  return null;
}

function countTeamMembers(
  user: OrganizationUser,
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
): number {
  if (!user.organizationRoleId) {
    return 0;
  }

  const vpRole = workspace.roles.find((role) => role.id === user.organizationRoleId);
  if (vpRole?.roleKind !== "vp" && user.campaignRole !== "vp_communications") {
    return 0;
  }

  const committeesUnderVp = workspace.committees.filter(
    (committee) => committee.parentRoleId === user.organizationRoleId,
  );

  const chairNames = new Set<string>();
  for (const committee of committeesUnderVp) {
    for (const chair of parseCommitteeChairNames(committee.contactName)) {
      chairNames.add(chair.toLowerCase());
    }
  }

  return Math.max(chairNames.size, members.filter((m) => m.status === "active").length - 1);
}

export function buildUnifiedTeamMembers(
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
): UnifiedTeamMember[] {
  return members.map((user) => {
    const displayName = resolveDisplayName(user, workspace);
    const committees = getMemberCommittees(user, displayName, workspace);

    const roleLabel =
      user.organizationRoleName ??
      (user.campaignRole === "admin" ? "Owner" : campaignRoleLabel(user.campaignRole));

    const orgRole = user.organizationRoleId
      ? workspace.roles.find((role) => role.id === user.organizationRoleId)
      : null;

    return {
      id: user.id,
      email: user.email,
      displayName,
      initials: deriveInitials(displayName),
      roleLabel,
      accessLabel: accessLevelLabel(user.campaignRole),
      accessLevel: user.campaignRole,
      committeeCount: committees.length,
      committees,
      status: user.status,
      lastActive: user.joinedAt,
      joinedAt: user.joinedAt,
      organizationRoleId: user.organizationRoleId,
      organizationRoleName: user.organizationRoleName,
      reportsTo: resolveReportsTo(user, workspace),
      teamMemberCount: countTeamMembers(user, members, workspace),
      isVp: orgRole?.roleKind === "vp" || user.campaignRole === "vp_communications",
      raw: user,
    };
  });
}

export function countOpenCommitteeRoles(committees: OrganizationCommittee[]): number {
  return committees.filter(
    (committee) => parseCommitteeChairNames(committee.contactName).length === 0,
  ).length;
}

export function countVpRoles(roles: OrganizationRole[]): number {
  return roles.filter((role) => role.roleKind === "vp").length;
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getCommitteesForVp(
  vpRoleId: string | null,
  committees: OrganizationCommittee[],
): OrganizationCommittee[] {
  if (!vpRoleId) {
    return [];
  }
  return committees.filter((committee) => committee.parentRoleId === vpRoleId);
}

export function countMembersForRole(
  roleId: string,
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
): number {
  const authCount = members.filter(
    (member) => member.organizationRoleId === roleId && member.status === "active",
  ).length;

  const rosterRole = workspace.roles.find((role) => role.id === roleId);
  if (rosterRole?.contactName?.trim()) {
    return Math.max(authCount, 1);
  }

  return authCount;
}
