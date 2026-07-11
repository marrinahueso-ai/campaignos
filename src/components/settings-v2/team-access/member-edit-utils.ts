import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import { normalizePersonToken } from "@/lib/task-hub/access";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";
import type { MemberCommitteeAssignment, UnifiedTeamMember } from "./team-access-utils";

export type MemberEditSource =
  | { kind: "org_user"; membershipId: string }
  | { kind: "org_role"; roleId: string }
  | { kind: "org_member"; memberId: string }
  | {
      kind: "committee";
      committeeId: string;
      committeeRole: "chair" | "co_chair" | "member";
    };

export interface MemberEditContext {
  source: MemberEditSource;
  canEditName: boolean;
  canEditEmail: boolean;
  canEditPhone: boolean;
  canEditRole: boolean;
  canEditAccess: boolean;
  canEditStatus: boolean;
  canEditVpPortfolio: boolean;
  canEditCommittee: boolean;
  defaultVpPortfolioId: string | null;
  defaultCommitteeId: string | null;
  defaultCommitteeRole: "chair" | "co_chair" | "member" | null;
  rosterMemberId: string | null;
}

function findRosterMember(
  member: UnifiedTeamMember,
  workspace: OrganizationWorkspaceData,
) {
  const emailLower = member.email?.trim().toLowerCase();
  const nameToken = normalizePersonToken(member.displayName);

  return workspace.members.find((entry) => {
    if (emailLower && entry.email?.trim().toLowerCase() === emailLower) {
      return true;
    }
    return normalizePersonToken(entry.name) === nameToken;
  });
}

function primaryCommitteeAssignment(member: UnifiedTeamMember) {
  const direct = member.committees.filter(
    (assignment) =>
      assignment.roleOnCommittee === "chair" ||
      assignment.roleOnCommittee === "co_chair" ||
      assignment.roleOnCommittee === "member",
  );
  if (direct.length === 0) {
    return null;
  }

  return direct.reduce((best, current) => {
    const priority = (role: typeof current.roleOnCommittee) => {
      switch (role) {
        case "chair":
          return 3;
        case "co_chair":
          return 2;
        case "member":
          return 1;
        default:
          return 0;
      }
    };
    return priority(current.roleOnCommittee) > priority(best.roleOnCommittee)
      ? current
      : best;
  });
}

function committeeAssignmentRole(
  role: MemberCommitteeAssignment["roleOnCommittee"] | undefined,
): "chair" | "co_chair" | "member" | null {
  if (role === "chair" || role === "co_chair" || role === "member") {
    return role;
  }
  return null;
}

function rosterCanSetAccessLevel(): boolean {
  return true;
}

export function resolveMemberEditContext(
  member: UnifiedTeamMember,
  workspace: OrganizationWorkspaceData,
): MemberEditContext {
  const rosterMember = findRosterMember(member, workspace);
  const primaryCommittee = primaryCommitteeAssignment(member);

  if (member.raw) {
    return {
      source: { kind: "org_user", membershipId: member.raw.id },
      canEditName: false,
      canEditEmail: false,
      canEditPhone: false,
      canEditRole: true,
      canEditAccess: true,
      canEditStatus: true,
      canEditVpPortfolio: true,
      canEditCommittee: true,
      defaultVpPortfolioId: member.vpPortfolioId,
      defaultCommitteeId: primaryCommittee?.committee.id ?? null,
      defaultCommitteeRole: committeeAssignmentRole(primaryCommittee?.roleOnCommittee),
      rosterMemberId: rosterMember?.id ?? null,
    };
  }

  if (member.isVp || member.isPresident) {
    const roleId = member.organizationRoleId;
    if (roleId) {
      return {
        source: { kind: "org_role", roleId },
        canEditName: true,
        canEditEmail: true,
        canEditPhone: true,
        canEditRole: false,
        canEditAccess: rosterCanSetAccessLevel(),
        canEditStatus: false,
        canEditVpPortfolio: true,
        canEditCommittee: false,
        defaultVpPortfolioId: roleId,
        defaultCommitteeId: null,
        defaultCommitteeRole: null,
        rosterMemberId: rosterMember?.id ?? null,
      };
    }
  }

  if (rosterMember) {
    return {
      source: { kind: "org_member", memberId: rosterMember.id },
      canEditName: true,
      canEditEmail: true,
      canEditPhone: false,
      canEditRole: true,
      canEditAccess: rosterCanSetAccessLevel(),
      canEditStatus: true,
      canEditVpPortfolio: true,
      canEditCommittee: true,
      defaultVpPortfolioId: rosterMember.organizationRoleId,
      defaultCommitteeId: primaryCommittee?.committee.id ?? null,
      defaultCommitteeRole: committeeAssignmentRole(primaryCommittee?.roleOnCommittee),
      rosterMemberId: rosterMember.id,
    };
  }

  if (primaryCommittee) {
    const committeeRole = committeeAssignmentRole(primaryCommittee.roleOnCommittee);
    if (!committeeRole) {
      return {
        source: { kind: "org_member", memberId: "" },
        canEditName: false,
        canEditEmail: false,
        canEditPhone: false,
        canEditRole: false,
        canEditAccess: false,
        canEditStatus: false,
        canEditVpPortfolio: false,
        canEditCommittee: false,
        defaultVpPortfolioId: null,
        defaultCommitteeId: null,
        defaultCommitteeRole: null,
        rosterMemberId: null,
      };
    }

    return {
      source: {
        kind: "committee",
        committeeId: primaryCommittee.committee.id,
        committeeRole,
      },
      canEditName: true,
      canEditEmail: true,
      canEditPhone: true,
      canEditRole: false,
      canEditAccess: rosterCanSetAccessLevel(),
      canEditStatus: false,
      canEditVpPortfolio: true,
      canEditCommittee: true,
      defaultVpPortfolioId: primaryCommittee.committee.parentRoleId,
      defaultCommitteeId: primaryCommittee.committee.id,
      defaultCommitteeRole: committeeRole,
      rosterMemberId: null,
    };
  }

  return {
    source: { kind: "org_member", memberId: "" },
    canEditName: false,
    canEditEmail: false,
    canEditPhone: false,
    canEditRole: false,
    canEditAccess: false,
    canEditStatus: false,
    canEditVpPortfolio: false,
    canEditCommittee: false,
    defaultVpPortfolioId: null,
    defaultCommitteeId: null,
    defaultCommitteeRole: null,
    rosterMemberId: null,
  };
}

export function updateCommitteeChairNames(
  committee: OrganizationCommittee,
  memberName: string,
  role: "chair" | "co_chair" | "member",
): string {
  const chairs = parseCommitteeChairNames(committee.contactName);
  const normalizedName = memberName.trim();
  const filtered = chairs.filter(
    (name) => normalizePersonToken(name) !== normalizePersonToken(normalizedName),
  );

  if (role === "chair") {
    return [normalizedName, filtered[1] ?? filtered[0]]
      .filter(Boolean)
      .join(", ");
  }

  if (role === "co_chair") {
    const chair = filtered[0] ?? chairs[0] ?? "";
    return [chair, normalizedName].filter(Boolean).join(", ");
  }

  if (filtered.length === 0) {
    return normalizedName;
  }

  return filtered.join(", ");
}

export function removeMemberFromCommittee(
  committee: OrganizationCommittee,
  memberName: string,
): string | null {
  const chairs = parseCommitteeChairNames(committee.contactName);
  const remaining = chairs.filter(
    (name) => normalizePersonToken(name) !== normalizePersonToken(memberName),
  );
  return remaining.length > 0 ? remaining.join(", ") : null;
}

export function findRoleById(
  roles: OrganizationRole[],
  roleId: string | null,
): OrganizationRole | null {
  if (!roleId) {
    return null;
  }
  return roles.find((role) => role.id === roleId) ?? null;
}
