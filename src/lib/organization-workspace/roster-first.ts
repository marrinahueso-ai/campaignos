/**
 * Pure helpers for roster committee assignment dual-write into packed contact_name.
 * Approval/publishing still read contact_name; assignment table is source of truth going forward.
 */

export type CommitteeAssignmentRole =
  | "chair"
  | "co_chair"
  | "member"
  | "supervising_vp";

export interface NamedCommitteeAssignment {
  role: CommitteeAssignmentRole;
  memberName: string;
}

const ROLE_PACK_ORDER: Record<Exclude<CommitteeAssignmentRole, "supervising_vp">, number> = {
  chair: 0,
  co_chair: 1,
  member: 2,
};

/**
 * Pack chair / co-chair / member names into legacy contact_name.
 * supervising_vp is omitted (stored via parent_role_id dual-write).
 */
export function packCommitteeContactName(
  assignments: NamedCommitteeAssignment[],
): string | null {
  const names = assignments
    .filter((entry) => entry.role !== "supervising_vp")
    .filter((entry) => entry.memberName.trim())
    .sort(
      (a, b) =>
        ROLE_PACK_ORDER[a.role as keyof typeof ROLE_PACK_ORDER] -
          ROLE_PACK_ORDER[b.role as keyof typeof ROLE_PACK_ORDER] ||
        a.memberName.localeCompare(b.memberName),
    )
    .map((entry) => entry.memberName.trim());

  // Prefer one chair then one co-chair then remaining members (stable unique)
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }

  return unique.length > 0 ? unique.join(", ") : null;
}

export function resolvePackedRoleFromIndex(
  index: number,
): Exclude<CommitteeAssignmentRole, "supervising_vp"> {
  if (index === 0) return "chair";
  if (index === 1) return "co_chair";
  return "member";
}

export function committeeAssignmentRoleLabel(
  role: CommitteeAssignmentRole,
  committeeName?: string | null,
): string {
  const committee = committeeName?.trim();
  switch (role) {
    case "chair":
      return committee ? `${committee} Chair` : "Committee Chair";
    case "co_chair":
      return committee ? `${committee} Co-Chair` : "Committee Co-Chair";
    case "member":
      return committee ? `${committee} Member` : "Committee Member";
    case "supervising_vp":
      return committee ? `${committee} Supervising VP` : "Supervising VP";
    default:
      return role;
  }
}

export function appAccessLabel(
  hasOrganizationUser: boolean,
  campaignRole: string | null | undefined,
): string {
  if (!hasOrganizationUser) {
    return "No app access";
  }

  switch (campaignRole) {
    case "admin":
    case "president":
      return "Admin";
    case "developer":
      return "Developer";
    case "tester":
      return "Tester";
    case "contributor":
    case "committee_chair":
    case "vp_communications":
      return "Contributor";
    case "view_only":
      return "Viewer";
    default:
      return campaignRole ? String(campaignRole) : "Contributor";
  }
}

export const ROSTER_ONLY_STATUS_LABEL = "Roster only — no app access";

/**
 * Decide whether inviting should attach to an existing org_user or create new.
 * Pure decision helper for duplicate prevention.
 */
export function resolveInviteLinkDecision(input: {
  existingOrgUser:
    | { id: string; status: string; organizationMemberId: string | null }
    | null;
  rosterMemberId: string;
  alreadyLinkedToOtherMember: boolean;
}):
  | { action: "error"; error: string }
  | { action: "update"; organizationUserId: string }
  | { action: "insert" } {
  if (input.alreadyLinkedToOtherMember) {
    return {
      action: "error",
      error: "This roster person is already linked to another login member.",
    };
  }

  const existing = input.existingOrgUser;
  if (!existing) {
    return { action: "insert" };
  }

  if (
    existing.organizationMemberId &&
    existing.organizationMemberId !== input.rosterMemberId
  ) {
    return {
      action: "error",
      error: "This email is already linked to a different roster person.",
    };
  }

  if (existing.status === "active" && existing.organizationMemberId === input.rosterMemberId) {
    return {
      action: "error",
      error: "This person already has app access.",
    };
  }

  if (existing.status === "active") {
    return {
      action: "error",
      error: "This email already belongs to an active team member.",
    };
  }

  return { action: "update", organizationUserId: existing.id };
}
