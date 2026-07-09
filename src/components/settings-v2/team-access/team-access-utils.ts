import {
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import {
  personTokensMatch,
  normalizePersonToken,
} from "@/lib/task-hub/access";
import { deriveInitials } from "@/lib/task-hub/org-members";
import type { OrganizationUser } from "@/types/auth";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

export type CommitteeStatus = "on_track" | "needs_attention" | "open_role";

export type UnifiedMemberStatus = OrganizationUser["status"] | "roster";

export interface UnifiedTeamMember {
  id: string;
  email: string;
  emailMissing: boolean;
  phone: string | null;
  phoneMissing: boolean;
  displayName: string;
  initials: string;
  orgRoleLabel: string;
  roleLabel: string;
  accessLabel: string;
  accessLevel: CampaignRole;
  vpPortfolio: string | null;
  vpPortfolioId: string | null;
  committeeCount: number;
  committees: MemberCommitteeAssignment[];
  vpOversightCommittees: MemberCommitteeAssignment[];
  status: UnifiedMemberStatus;
  isRosterOnly: boolean;
  lastActive: string | null;
  joinedAt: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  reportsTo: string | null;
  teamMemberCount: number;
  isVp: boolean;
  isPresident: boolean;
  hasRoleOversight: boolean;
  openTasks: number;
  campaigns: number;
  approvalsWaiting: number;
  totalCommittees: number;
  totalCommitteeMembers: number;
  openCommitteeRoles: number;
  raw: OrganizationUser | null;
}

export interface MemberCommitteeAssignment {
  committee: OrganizationCommittee;
  roleOnCommittee: "vp" | "chair" | "co_chair" | "member";
  status: CommitteeStatus;
  memberNames: string[];
  memberCount: number;
  openTasks: number;
  campaigns: number;
  approvals: number;
}

interface RosterPersonSeed {
  displayName: string;
  email: string | null;
  phone: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  isVp: boolean;
  isPresident: boolean;
  vpPortfolioId: string | null;
  vpPortfolioName: string | null;
  oversightRoleId?: string;
  committeeAssignment?: {
    committee: OrganizationCommittee;
    roleOnCommittee: MemberCommitteeAssignment["roleOnCommittee"];
  };
  organizationUser: OrganizationUser | null;
}

interface PersonAccumulator {
  dedupeKey: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  isVp: boolean;
  isPresident: boolean;
  vpPortfolioId: string | null;
  vpPortfolioName: string | null;
  oversightRoleIds: Set<string>;
  organizationUser: OrganizationUser | null;
  committeeAssignments: Map<
    string,
    {
      committee: OrganizationCommittee;
      roleOnCommittee: MemberCommitteeAssignment["roleOnCommittee"];
    }
  >;
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

function makeDedupeKey(email: string | null | undefined, name: string): string {
  const trimmedEmail = email?.trim().toLowerCase();
  if (trimmedEmail) {
    return `email:${trimmedEmail}`;
  }
  return `name:${normalizePersonToken(name)}`;
}

function personIdentityMatches(
  a: { displayName: string; email: string | null },
  b: { displayName: string; email: string | null },
): boolean {
  const emailA = a.email?.trim().toLowerCase();
  const emailB = b.email?.trim().toLowerCase();

  if (emailA && emailB && emailA === emailB) {
    return true;
  }

  const nameA = normalizePersonToken(a.displayName);
  const nameB = normalizePersonToken(b.displayName);
  if (nameA && nameB && nameA === nameB) {
    return true;
  }

  if (emailA && nameB && personTokensMatch(formatEmailAsName(emailA), b.displayName)) {
    return true;
  }

  if (emailB && nameA && personTokensMatch(formatEmailAsName(emailB), a.displayName)) {
    return true;
  }

  return false;
}

function personMatchesSeed(
  person: PersonAccumulator,
  seed: Pick<RosterPersonSeed, "displayName" | "email">,
): boolean {
  return personIdentityMatches(
    { displayName: person.displayName, email: person.email },
    { displayName: seed.displayName, email: seed.email },
  );
}

function findExistingPerson(
  people: Map<string, PersonAccumulator>,
  seed: Pick<RosterPersonSeed, "displayName" | "email">,
): PersonAccumulator | undefined {
  const directKey = makeDedupeKey(seed.email, seed.displayName);
  const direct = people.get(directKey);
  if (direct) {
    return direct;
  }

  for (const person of people.values()) {
    if (personMatchesSeed(person, seed)) {
      return person;
    }
  }

  return undefined;
}

function mergePersonSeed(
  people: Map<string, PersonAccumulator>,
  seed: RosterPersonSeed,
): PersonAccumulator {
  const existing = findExistingPerson(people, seed);
  const dedupeKey = existing?.dedupeKey ?? makeDedupeKey(seed.email, seed.displayName);

  const person: PersonAccumulator = existing ?? {
    dedupeKey,
    displayName: seed.displayName.trim(),
    email: seed.email?.trim().toLowerCase() ?? null,
    phone: seed.phone,
    organizationRoleId: seed.organizationRoleId,
    organizationRoleName: seed.organizationRoleName,
    isVp: seed.isVp,
    isPresident: seed.isPresident,
    vpPortfolioId: seed.vpPortfolioId,
    vpPortfolioName: seed.vpPortfolioName,
    oversightRoleIds: new Set(),
    organizationUser: seed.organizationUser,
    committeeAssignments: new Map(),
  };

  if (seed.displayName.trim()) {
    person.displayName = seed.displayName.trim();
  }

  if (seed.email?.trim()) {
    person.email = seed.email.trim().toLowerCase();
  }

  if (seed.phone?.trim()) {
    person.phone = seed.phone.trim();
  } else if (person.phone === null && seed.phone === null) {
    person.phone = null;
  }

  if (seed.organizationUser) {
    person.organizationUser = seed.organizationUser;
  }

  if (seed.organizationRoleId) {
    person.organizationRoleId = seed.organizationRoleId;
    person.organizationRoleName = seed.organizationRoleName;
  }

  if (seed.isVp) {
    person.isVp = true;
    person.vpPortfolioId = seed.vpPortfolioId ?? seed.organizationRoleId;
    person.vpPortfolioName = seed.vpPortfolioName ?? seed.organizationRoleName;
  }

  if (seed.isPresident) {
    person.isPresident = true;
  }

  if (seed.oversightRoleId) {
    person.oversightRoleIds.add(seed.oversightRoleId);
    if (!person.organizationRoleId) {
      person.organizationRoleId = seed.oversightRoleId;
      person.organizationRoleName = seed.organizationRoleName;
    }
  }

  if (!person.isVp && seed.vpPortfolioId && !person.vpPortfolioId) {
    person.vpPortfolioId = seed.vpPortfolioId;
    person.vpPortfolioName = seed.vpPortfolioName;
  }

  if (seed.committeeAssignment) {
    const { committee, roleOnCommittee } = seed.committeeAssignment;
    const current = person.committeeAssignments.get(committee.id);
    if (!current || rolePriority(roleOnCommittee) > rolePriority(current.roleOnCommittee)) {
      person.committeeAssignments.set(committee.id, {
        committee,
        roleOnCommittee,
      });
    }
  }

  people.set(person.dedupeKey, person);
  return person;
}

function rolePriority(role: MemberCommitteeAssignment["roleOnCommittee"]): number {
  switch (role) {
    case "chair":
      return 4;
    case "co_chair":
      return 3;
    case "member":
      return 2;
    case "vp":
      return 1;
    default:
      return 0;
  }
}

function resolveCommitteeRoleOnIndex(index: number): MemberCommitteeAssignment["roleOnCommittee"] {
  if (index === 0) {
    return "chair";
  }
  if (index === 1) {
    return "co_chair";
  }
  return "member";
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

function resolveOrgRoleLabel(input: {
  isPresident: boolean;
  isVp: boolean;
  organizationRoleName: string | null;
  committeeAssignments: MemberCommitteeAssignment[];
  campaignRole: CampaignRole;
}): string {
  if (input.isPresident) {
    return "President";
  }

  if (input.isVp) {
    return input.organizationRoleName ?? "VP";
  }

  if (input.campaignRole === "admin") {
    return "Owner";
  }

  const committeeRole = input.committeeAssignments.reduce<
    MemberCommitteeAssignment["roleOnCommittee"] | null
  >((best, assignment) => {
    if (!best || rolePriority(assignment.roleOnCommittee) > rolePriority(best)) {
      return assignment.roleOnCommittee;
    }
    return best;
  }, null);

  switch (committeeRole) {
    case "chair":
      return "Committee Chair";
    case "co_chair":
      return "Committee Co-Chair";
    case "member":
      return "Committee Member";
    default:
      break;
  }

  switch (input.campaignRole) {
    case "view_only":
      return "Viewer";
    case "contributor":
      return "Volunteer";
    case "committee_chair":
      return "Committee Chair";
    case "vp_communications":
      return "VP Communications";
    default:
      return campaignRoleLabel(input.campaignRole);
  }
}

function resolveAccessLevel(
  organizationUser: OrganizationUser | null,
  isVp: boolean,
  isPresident: boolean,
  committeeAssignments: MemberCommitteeAssignment[],
): CampaignRole {
  if (organizationUser) {
    return organizationUser.campaignRole;
  }

  if (isPresident) {
    return "president";
  }

  if (isVp) {
    return "vp_communications";
  }

  if (committeeAssignments.some((assignment) => assignment.roleOnCommittee === "chair")) {
    return "committee_chair";
  }

  if (
    committeeAssignments.some(
      (assignment) =>
        assignment.roleOnCommittee === "co_chair" ||
        assignment.roleOnCommittee === "member",
    )
  ) {
    return "contributor";
  }

  return "view_only";
}

function resolveReportsTo(
  person: PersonAccumulator,
  workspace: OrganizationWorkspaceData,
): string | null {
  if (person.isPresident || person.organizationUser?.campaignRole === "admin") {
    return null;
  }

  if (person.isVp) {
    const president = workspace.roles.find((role) => role.roleKind === "president");
    if (president?.contactName?.trim()) {
      return `${president.contactName.trim()}, President`;
    }
    return president?.name ?? null;
  }

  if (person.vpPortfolioName) {
    const vpRole = workspace.roles.find((role) => role.id === person.vpPortfolioId);
    if (vpRole?.contactName?.trim()) {
      return `${vpRole.contactName.trim()}, ${person.vpPortfolioName}`;
    }
    return person.vpPortfolioName;
  }

  const president = workspace.roles.find((role) => role.roleKind === "president");
  if (president?.contactName?.trim()) {
    return `${president.contactName.trim()}, President`;
  }

  return president?.name ?? null;
}

function buildCommitteeAssignment(
  committee: OrganizationCommittee,
  roleOnCommittee: MemberCommitteeAssignment["roleOnCommittee"],
  workload?: TeamAccessWorkloadIndex,
): MemberCommitteeAssignment {
  const memberNames = parseCommitteeChairNames(committee.contactName);
  const stats = workload?.byCommitteeId[committee.id];

  return {
    committee,
    roleOnCommittee,
    status: resolveCommitteeStatus(committee),
    memberNames,
    memberCount: stats?.memberCount ?? memberNames.length,
    openTasks: stats?.openTasks ?? 0,
    campaigns: stats?.campaigns ?? 0,
    approvals: stats?.approvalsWaiting ?? 0,
  };
}

function buildRoleOversightCommittees(
  oversightRoleIds: Set<string>,
  workspace: OrganizationWorkspaceData,
  workload?: TeamAccessWorkloadIndex,
): MemberCommitteeAssignment[] {
  if (oversightRoleIds.size === 0) {
    return [];
  }

  return workspace.committees
    .filter(
      (committee) =>
        committee.parentRoleId !== null &&
        oversightRoleIds.has(committee.parentRoleId),
    )
    .map((committee) => buildCommitteeAssignment(committee, "vp", workload));
}

function mergeMemberCommitteeAssignments(
  directAssignments: MemberCommitteeAssignment[],
  oversightAssignments: MemberCommitteeAssignment[],
): MemberCommitteeAssignment[] {
  const byCommitteeId = new Map<string, MemberCommitteeAssignment>();

  for (const assignment of [...oversightAssignments, ...directAssignments]) {
    const existing = byCommitteeId.get(assignment.committee.id);
    if (
      !existing ||
      rolePriority(assignment.roleOnCommittee) >
        rolePriority(existing.roleOnCommittee)
    ) {
      byCommitteeId.set(assignment.committee.id, assignment);
    }
  }

  return [...byCommitteeId.values()].sort((a, b) =>
    a.committee.name.localeCompare(b.committee.name),
  );
}

function countUniqueCommitteeMembers(committees: OrganizationCommittee[]): number {
  const names = new Set<string>();
  for (const committee of committees) {
    for (const name of parseCommitteeChairNames(committee.contactName)) {
      names.add(normalizePersonToken(name));
    }
  }
  return names.size;
}

function countOpenCommitteeRolesForOversightRoles(
  oversightRoleIds: Set<string>,
  committees: OrganizationCommittee[],
): number {
  if (oversightRoleIds.size === 0) {
    return 0;
  }

  return committees.filter(
    (committee) =>
      committee.parentRoleId !== null &&
      oversightRoleIds.has(committee.parentRoleId) &&
      parseCommitteeChairNames(committee.contactName).length === 0,
  ).length;
}

function resolveDisplayNameFromWorkspace(
  email: string,
  workspace: OrganizationWorkspaceData,
): string {
  const emailLower = email.toLowerCase();

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

  return formatEmailAsName(email);
}

function collectRosterPeople(
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
): Map<string, PersonAccumulator> {
  const people = new Map<string, PersonAccumulator>();

  for (const user of members) {
    const displayName = resolveDisplayNameFromWorkspace(user.email, workspace);
    mergePersonSeed(people, {
      displayName,
      email: user.email,
      phone: null,
      organizationRoleId: user.organizationRoleId,
      organizationRoleName: user.organizationRoleName,
      isVp: false,
      isPresident: false,
      vpPortfolioId: null,
      vpPortfolioName: null,
      organizationUser: user,
    });
  }

  for (const rosterMember of workspace.members) {
    mergePersonSeed(people, {
      displayName: rosterMember.name,
      email: rosterMember.email,
      phone: null,
      organizationRoleId: rosterMember.organizationRoleId,
      organizationRoleName: rosterMember.roleName,
      isVp: false,
      isPresident: false,
      vpPortfolioId: rosterMember.organizationRoleId,
      vpPortfolioName: rosterMember.roleName,
      organizationUser: null,
    });
  }

  for (const role of workspace.roles) {
    if (!role.contactName?.trim()) {
      continue;
    }

    const isPresident = role.roleKind === "president";
    const isVp = role.roleKind === "vp";

    mergePersonSeed(people, {
      displayName: role.contactName.trim(),
      email: role.contactEmail,
      phone: role.contactPhone,
      organizationRoleId: role.id,
      organizationRoleName: role.name,
      isVp,
      isPresident,
      vpPortfolioId: isVp || isPresident ? role.id : null,
      vpPortfolioName: isVp || isPresident ? role.name : null,
      oversightRoleId: role.id,
      organizationUser: null,
    });
  }

  for (const committee of workspace.committees) {
    const chairs = parseCommitteeChairNames(committee.contactName);
    const vpPortfolioId = committee.parentRoleId;
    const vpPortfolioName = committee.parentRoleName;

    chairs.forEach((chairName, index) => {
      mergePersonSeed(people, {
        displayName: chairName,
        email: index === 0 ? committee.contactEmail : null,
        phone: index === 0 ? committee.contactPhone : null,
        organizationRoleId: null,
        organizationRoleName: null,
        isVp: false,
        isPresident: false,
        vpPortfolioId,
        vpPortfolioName,
        organizationUser: null,
        committeeAssignment: {
          committee,
          roleOnCommittee: resolveCommitteeRoleOnIndex(index),
        },
      });
    });
  }

  for (const person of people.values()) {
    for (const roleId of person.oversightRoleIds) {
      for (const committee of workspace.committees) {
        if (committee.parentRoleId !== roleId) {
          continue;
        }

        const current = person.committeeAssignments.get(committee.id);
        if (current && current.roleOnCommittee !== "vp") {
          continue;
        }

        person.committeeAssignments.set(committee.id, {
          committee,
          roleOnCommittee: "vp",
        });
      }
    }
  }

  return people;
}

function finalizeUnifiedMember(
  person: PersonAccumulator,
  workspace: OrganizationWorkspaceData,
  workload?: TeamAccessWorkloadIndex,
): UnifiedTeamMember {
  const directCommitteeAssignments = [...person.committeeAssignments.values()]
    .filter((assignment) => assignment.roleOnCommittee !== "vp")
    .map((assignment) =>
      buildCommitteeAssignment(
        assignment.committee,
        assignment.roleOnCommittee,
        workload,
      ),
    );

  const roleOversightCommittees = buildRoleOversightCommittees(
    person.oversightRoleIds,
    workspace,
    workload,
  );

  const committees = mergeMemberCommitteeAssignments(
    directCommitteeAssignments,
    roleOversightCommittees,
  );

  const vpOversightCommittees = roleOversightCommittees;

  const accessLevel = resolveAccessLevel(
    person.organizationUser,
    person.isVp,
    person.isPresident,
    directCommitteeAssignments,
  );

  const orgRoleLabel = resolveOrgRoleLabel({
    isPresident: person.isPresident,
    isVp: person.isVp,
    organizationRoleName: person.organizationRoleName,
    committeeAssignments: directCommitteeAssignments,
    campaignRole: accessLevel,
  });

  const oversightCommittees = workspace.committees.filter(
    (committee) =>
      committee.parentRoleId !== null &&
      person.oversightRoleIds.has(committee.parentRoleId),
  );

  const hasRoleOversight = person.oversightRoleIds.size > 0;

  const openTasks = committees.reduce((sum, assignment) => sum + assignment.openTasks, 0);
  const campaigns = committees.reduce((sum, assignment) => sum + assignment.campaigns, 0);
  const approvalsWaiting = committees.reduce(
    (sum, assignment) => sum + assignment.approvals,
    0,
  );

  const emailMissing = !person.email;
  const phoneMissing = !person.phone;

  return {
    id: person.organizationUser?.id ?? `roster:${person.dedupeKey}`,
    email: person.email ?? "",
    emailMissing,
    phone: person.phone,
    phoneMissing,
    displayName: person.displayName,
    initials: deriveInitials(person.displayName),
    orgRoleLabel,
    roleLabel: orgRoleLabel,
    accessLabel: accessLevelLabel(accessLevel),
    accessLevel,
    vpPortfolio: person.isVp
      ? person.organizationRoleName
      : person.vpPortfolioName,
    vpPortfolioId: person.isVp
      ? person.organizationRoleId
      : person.vpPortfolioId,
    committeeCount: committees.length,
    committees,
    vpOversightCommittees,
    status: person.organizationUser?.status ?? "roster",
    isRosterOnly: !person.organizationUser,
    lastActive: person.organizationUser?.joinedAt ?? null,
    joinedAt: person.organizationUser?.joinedAt ?? null,
    organizationRoleId: person.organizationRoleId,
    organizationRoleName: person.organizationRoleName,
    reportsTo: resolveReportsTo(person, workspace),
    teamMemberCount: hasRoleOversight
      ? countUniqueCommitteeMembers(oversightCommittees)
      : 0,
    isVp: person.isVp,
    isPresident: person.isPresident,
    hasRoleOversight,
    openTasks,
    campaigns,
    approvalsWaiting,
    totalCommittees: hasRoleOversight ? oversightCommittees.length : committees.length,
    totalCommitteeMembers: hasRoleOversight
      ? countUniqueCommitteeMembers(oversightCommittees)
      : 0,
    openCommitteeRoles: hasRoleOversight
      ? countOpenCommitteeRolesForOversightRoles(
          person.oversightRoleIds,
          workspace.committees,
        )
      : 0,
    raw: person.organizationUser,
  };
}

export function buildUnifiedTeamMembers(
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
  workload?: TeamAccessWorkloadIndex,
): UnifiedTeamMember[] {
  const people = collectRosterPeople(members, workspace);

  return [...people.values()]
    .map((person) => finalizeUnifiedMember(person, workspace, workload))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
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

export function formatMemberEmail(member: UnifiedTeamMember): string {
  if (member.emailMissing) {
    return "No email";
  }
  return member.email;
}

export function formatMemberPhone(member: UnifiedTeamMember): string {
  if (member.phoneMissing || !member.phone) {
    return "No phone";
  }
  return member.phone;
}

export function formatCount(value: number): string {
  return value > 0 ? String(value) : "—";
}
