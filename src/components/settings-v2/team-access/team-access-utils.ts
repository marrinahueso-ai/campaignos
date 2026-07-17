import {
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import {
  appAccessLabel,
  ROSTER_ONLY_STATUS_LABEL,
  type CommitteeAssignmentRole,
} from "@/lib/organization-workspace/roster-first";
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
  /** Template id for display (custom_* or system); auth still uses accessLevel. */
  accessTemplateId: string | null;
  vpPortfolio: string | null;
  vpPortfolioId: string | null;
  committeeCount: number;
  committees: MemberCommitteeAssignment[];
  vpOversightCommittees: MemberCommitteeAssignment[];
  status: UnifiedMemberStatus;
  statusLabel: string;
  isRosterOnly: boolean;
  lastActive: string | null;
  joinedAt: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  organizationMemberId: string | null;
  assignedEventIds: string[];
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
  roleOnCommittee: "vp" | "chair" | "co_chair" | "member" | "supervising_vp";
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
  organizationMemberId?: string | null;
  assignedEventIds?: string[];
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
  rosterCampaignRole?: CampaignRole | null;
  rosterCampaignRolePriority?: number;
}

interface PersonAccumulator {
  dedupeKey: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  organizationMemberId: string | null;
  assignedEventIds: string[];
  isVp: boolean;
  isPresident: boolean;
  vpPortfolioId: string | null;
  vpPortfolioName: string | null;
  oversightRoleIds: Set<string>;
  organizationUser: OrganizationUser | null;
  rosterCampaignRole: CampaignRole | null;
  rosterCampaignRolePriority: number;
  committeeAssignments: Map<
    string,
    {
      committee: OrganizationCommittee;
      roleOnCommittee: MemberCommitteeAssignment["roleOnCommittee"];
    }
  >;
}

export { ROSTER_ONLY_STATUS_LABEL };

/** People UI login status — never show “Roster Only”. */
export type PeopleLoginStatus =
  | "not_invited"
  | "invited"
  | "active"
  | "inactive";

/** Responsibility labels for Team & Access (backend roles unchanged). */
export function peopleResponsibilityLabel(
  role: MemberCommitteeAssignment["roleOnCommittee"] | CommitteeAssignmentRole,
): string {
  switch (role) {
    case "chair":
      return "Event Lead";
    case "co_chair":
      return "Assistant Lead";
    case "member":
      return "Team Member";
    case "supervising_vp":
    case "vp":
      return "Supervisor";
    default:
      return "Team Member";
  }
}

export function peopleLoginStatus(
  member: Pick<UnifiedTeamMember, "status" | "isRosterOnly">,
): PeopleLoginStatus {
  if (member.isRosterOnly || member.status === "roster") {
    return "not_invited";
  }
  if (member.status === "invited") {
    return "invited";
  }
  if (member.status === "deactivated") {
    return "inactive";
  }
  return "active";
}

/** Resend/reinvite is for pending invites and inactive (deactivated) login members. */
export function canResendTeamInvite(
  member: Pick<UnifiedTeamMember, "status" | "raw">,
  canManage: boolean,
): boolean {
  return (
    canManage &&
    Boolean(member.raw) &&
    (member.status === "invited" || member.status === "deactivated")
  );
}

export function resendTeamInviteLabel(
  member: Pick<UnifiedTeamMember, "status">,
): string {
  return member.status === "deactivated" ? "Reinvite to Login" : "Resend Invite";
}

export function peopleLoginStatusLabel(status: PeopleLoginStatus): string {
  switch (status) {
    case "not_invited":
      return "Not Invited";
    case "invited":
      return "Invited";
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
  }
}

/** Secondary access badge under Active — not the primary Login Status. */
export function peopleAccessBadgeLabel(
  member: Pick<
    UnifiedTeamMember,
    "isRosterOnly" | "accessLevel" | "accessTemplateId" | "isPresident"
  >,
  customLabels?: Partial<Record<string, string>> | null,
): string | null {
  if (member.isRosterOnly) {
    return null;
  }
  const templateKey = member.accessTemplateId ?? member.accessLevel;
  const custom = customLabels?.[templateKey]?.trim();
  if (custom) {
    return custom;
  }
  if (member.isPresident || member.accessLevel === "president") {
    return "President";
  }
  if (member.accessLevel === "admin") {
    return "Admin";
  }
  if (member.accessLevel === "developer") {
    return "Developer";
  }
  if (member.accessLevel === "tester") {
    return "Tester";
  }
  if (member.accessLevel === "view_only") {
    return "View Only";
  }
  if (
    member.accessLevel === "contributor" ||
    member.accessLevel === "committee_chair" ||
    member.accessLevel === "vp_communications"
  ) {
    return "Contributor";
  }
  return null;
}

/** Unique events from direct assignment + roles/teams this person is responsible for. */
export function peopleRelatedEventIds(member: UnifiedTeamMember): string[] {
  const ids = new Set<string>(member.assignedEventIds);
  for (const assignment of member.committees) {
    const eventId = assignment.committee.assignedEventId;
    if (eventId) {
      ids.add(eventId);
    }
  }
  return Array.from(ids);
}

export type PersonEventInvolvement = {
  /** Null when the person has a team role that is not yet tied to an Event ID. */
  eventId: string | null;
  title: string;
  roleLabel: string;
  committeeId: string | null;
  committeeName: string | null;
  needsEventLink: boolean;
};

/**
 * One involvement per Event ID (with role), plus unlinked team roles that still
 * need an Event ID. Pure helper — no fetches.
 */
export function buildPersonEventInvolvements(
  member: UnifiedTeamMember,
  eventTitlesById: Map<string, string> = new Map(),
): PersonEventInvolvement[] {
  const byEventId = new Map<string, PersonEventInvolvement>();

  for (const assignment of member.committees) {
    const eventId = assignment.committee.assignedEventId;
    const roleLabel = peopleResponsibilityLabel(assignment.roleOnCommittee);
    if (eventId) {
      byEventId.set(eventId, {
        eventId,
        title: eventTitlesById.get(eventId) ?? assignment.committee.name,
        roleLabel,
        committeeId: assignment.committee.id,
        committeeName: assignment.committee.name,
        needsEventLink: false,
      });
    }
  }

  for (const eventId of member.assignedEventIds) {
    if (byEventId.has(eventId)) {
      continue;
    }
    byEventId.set(eventId, {
      eventId,
      title: eventTitlesById.get(eventId) ?? "Assigned event",
      roleLabel: "Team Member",
      committeeId: null,
      committeeName: null,
      needsEventLink: false,
    });
  }

  const linked = Array.from(byEventId.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const unlinked = member.committees
    .filter((assignment) => !assignment.committee.assignedEventId)
    .map((assignment) => ({
      eventId: null as string | null,
      title: assignment.committee.name,
      roleLabel: peopleResponsibilityLabel(assignment.roleOnCommittee),
      committeeId: assignment.committee.id,
      committeeName: assignment.committee.name,
      needsEventLink: true,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return [...linked, ...unlinked];
}

export function memberMatchesPeopleSearch(
  member: UnifiedTeamMember,
  query: string,
  eventTitlesById: Map<string, string>,
): boolean {
  const search = query.trim().toLowerCase();
  if (!search) {
    return true;
  }

  const loginLabel = peopleLoginStatusLabel(peopleLoginStatus(member)).toLowerCase();
  const accessBadge = peopleAccessBadgeLabel(member)?.toLowerCase() ?? "";
  const responsibilityLabels = member.committees.map((assignment) =>
    peopleResponsibilityLabel(assignment.roleOnCommittee).toLowerCase(),
  );
  const eventTitles = peopleRelatedEventIds(member).map(
    (eventId) => eventTitlesById.get(eventId)?.toLowerCase() ?? "",
  );

  const haystack = [
    member.displayName,
    member.email,
    member.phone ?? "",
    member.orgRoleLabel,
    member.roleLabel,
    member.organizationRoleName ?? "",
    member.statusLabel,
    loginLabel,
    accessBadge,
    member.accessLabel,
    ...responsibilityLabels,
    ...eventTitles,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
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

function makeMemberDedupeKey(organizationMemberId: string): string {
  return `member:${organizationMemberId}`;
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
  seed: Pick<
    RosterPersonSeed,
    "displayName" | "email" | "organizationMemberId" | "organizationUser"
  >,
): PersonAccumulator | undefined {
  const memberId =
    seed.organizationMemberId?.trim() ||
    seed.organizationUser?.organizationMemberId?.trim() ||
    null;

  if (memberId) {
    const byMember = people.get(makeMemberDedupeKey(memberId));
    if (byMember) {
      return byMember;
    }
    for (const person of people.values()) {
      if (person.organizationMemberId === memberId) {
        return person;
      }
    }
  }

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
  const memberId =
    seed.organizationMemberId?.trim() ||
    seed.organizationUser?.organizationMemberId?.trim() ||
    existing?.organizationMemberId ||
    null;
  const dedupeKey =
    existing?.dedupeKey ??
    (memberId
      ? makeMemberDedupeKey(memberId)
      : makeDedupeKey(seed.email, seed.displayName));

  if (existing && existing.dedupeKey !== dedupeKey) {
    people.delete(existing.dedupeKey);
  }

  const person: PersonAccumulator = existing ?? {
    dedupeKey,
    displayName: seed.displayName.trim(),
    email: seed.email?.trim().toLowerCase() ?? null,
    phone: seed.phone,
    organizationRoleId: seed.organizationRoleId,
    organizationRoleName: seed.organizationRoleName,
    organizationMemberId: memberId,
    assignedEventIds: seed.assignedEventIds ?? [],
    isVp: seed.isVp,
    isPresident: seed.isPresident,
    vpPortfolioId: seed.vpPortfolioId,
    vpPortfolioName: seed.vpPortfolioName,
    oversightRoleIds: new Set(),
    organizationUser: seed.organizationUser,
    rosterCampaignRole: null,
    rosterCampaignRolePriority: 0,
    committeeAssignments: new Map(),
  };

  person.dedupeKey = dedupeKey;

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

  if (memberId) {
    person.organizationMemberId = memberId;
  }

  if (seed.assignedEventIds && seed.assignedEventIds.length > 0) {
    person.assignedEventIds = Array.from(
      new Set([...person.assignedEventIds, ...seed.assignedEventIds]),
    );
  }

  if (seed.organizationUser) {
    person.organizationUser = seed.organizationUser;
    if (seed.organizationUser.assignedEventIds?.length) {
      person.assignedEventIds = Array.from(
        new Set([
          ...person.assignedEventIds,
          ...seed.organizationUser.assignedEventIds,
        ]),
      );
    }
    if (seed.organizationUser.organizationMemberId) {
      person.organizationMemberId = seed.organizationUser.organizationMemberId;
    }
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

  if (seed.rosterCampaignRole) {
    const priority = seed.rosterCampaignRolePriority ?? 0;
    if (
      !person.rosterCampaignRole ||
      priority >= person.rosterCampaignRolePriority
    ) {
      person.rosterCampaignRole = seed.rosterCampaignRole;
      person.rosterCampaignRolePriority = priority;
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
    case "supervising_vp":
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
  hasAppAccess: boolean;
}): string {
  if (input.isPresident) {
    return "President";
  }

  if (input.isVp) {
    return input.organizationRoleName ?? "VP";
  }

  if (input.hasAppAccess && input.campaignRole === "admin") {
    return "Administrator";
  }

  const committeeRole = input.committeeAssignments.reduce<
    MemberCommitteeAssignment | null
  >((best, assignment) => {
    if (
      !best ||
      rolePriority(assignment.roleOnCommittee) > rolePriority(best.roleOnCommittee)
    ) {
      return assignment;
    }
    return best;
  }, null);

  if (committeeRole) {
    return peopleResponsibilityLabel(committeeRole.roleOnCommittee);
  }

  if (input.organizationRoleName) {
    return input.organizationRoleName;
  }

  if (!input.hasAppAccess) {
    return "Team Member";
  }

  switch (input.campaignRole) {
    case "view_only":
      return "View Only";
    case "contributor":
      return "Team Member";
    case "committee_chair":
      return "Event Lead";
    case "vp_communications":
      return "VP Communications";
    case "developer":
      return "Developer";
    case "tester":
      return "Tester";
    case "president":
      return "President";
    case "admin":
      return "Administrator";
    default:
      return campaignRoleLabel(input.campaignRole);
  }
}

function resolveAccessLevel(person: PersonAccumulator): CampaignRole {
  if (person.organizationUser) {
    return person.organizationUser.campaignRole;
  }

  // Roster-only: use the planned Access template base role when set.
  // Do not invent access from board/committee titles.
  return person.rosterCampaignRole ?? "contributor";
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

  // Prefer roster member rows as the join key when assignment tables are loaded.
  for (const rosterMember of workspace.members) {
    if (!rosterMember.active) {
      continue;
    }
    mergePersonSeed(people, {
      displayName: rosterMember.name,
      email: rosterMember.email,
      phone: rosterMember.phone,
      organizationRoleId: rosterMember.organizationRoleId,
      organizationRoleName: rosterMember.roleName,
      organizationMemberId: rosterMember.id,
      assignedEventIds: rosterMember.assignedEventIds ?? [],
      isVp: false,
      isPresident: false,
      vpPortfolioId: rosterMember.organizationRoleId,
      vpPortfolioName: rosterMember.roleName,
      organizationUser: null,
      rosterCampaignRole: rosterMember.campaignRole,
      rosterCampaignRolePriority: 2,
    });
  }

  for (const user of members) {
    const displayName =
      user.displayName?.trim() ||
      resolveDisplayNameFromWorkspace(user.email, workspace);
    mergePersonSeed(people, {
      displayName,
      email: user.email,
      phone: null,
      organizationRoleId: user.organizationRoleId,
      organizationRoleName: user.organizationRoleName,
      organizationMemberId: user.organizationMemberId,
      assignedEventIds: user.assignedEventIds ?? [],
      isVp: false,
      isPresident: false,
      vpPortfolioId: null,
      vpPortfolioName: null,
      organizationUser: user,
    });
  }

  for (const role of workspace.roles) {
    if (role.archivedAt) {
      continue;
    }
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
      rosterCampaignRole: role.campaignRole,
      rosterCampaignRolePriority: 3,
    });
  }

  for (const committee of workspace.committees) {
    if (committee.archivedAt) {
      continue;
    }
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
        rosterCampaignRole: committee.campaignRole,
        rosterCampaignRolePriority: 1,
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

  const accessLevel = resolveAccessLevel(person);
  const isRosterOnly = !person.organizationUser;

  const orgRoleLabel = resolveOrgRoleLabel({
    isPresident: person.isPresident,
    isVp: person.isVp,
    organizationRoleName: person.organizationRoleName,
    committeeAssignments: directCommitteeAssignments,
    campaignRole: accessLevel,
    hasAppAccess: !isRosterOnly,
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
  const status = person.organizationUser?.status ?? "roster";

  return {
    id:
      person.organizationUser?.id ??
      (person.organizationMemberId
        ? `roster-member:${person.organizationMemberId}`
        : `roster:${person.dedupeKey}`),
    email: person.email ?? "",
    emailMissing,
    phone: person.phone,
    phoneMissing,
    displayName: person.displayName,
    initials: deriveInitials(person.displayName),
    orgRoleLabel,
    roleLabel: orgRoleLabel,
    accessLabel: accessLevelLabel(
      person.organizationUser?.accessTemplateId ?? accessLevel,
      false,
    ),
    accessLevel,
    accessTemplateId:
      person.organizationUser?.accessTemplateId ?? accessLevel,
    vpPortfolio: person.isVp
      ? person.organizationRoleName
      : person.vpPortfolioName,
    vpPortfolioId: person.isVp
      ? person.organizationRoleId
      : person.vpPortfolioId,
    committeeCount: committees.length,
    committees,
    vpOversightCommittees,
    status,
    statusLabel: memberStatusLabel(status, isRosterOnly),
    isRosterOnly,
    lastActive: person.organizationUser?.joinedAt ?? null,
    joinedAt: person.organizationUser?.joinedAt ?? null,
    organizationRoleId: person.organizationRoleId,
    organizationRoleName: person.organizationRoleName,
    organizationMemberId: person.organizationMemberId,
    assignedEventIds: person.assignedEventIds,
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

/** Resolve one profile member without materializing the full unified roster. */
export function findUnifiedTeamMemberById(
  memberId: string,
  members: OrganizationUser[],
  workspace: OrganizationWorkspaceData,
  workload?: TeamAccessWorkloadIndex,
): UnifiedTeamMember | null {
  const people = collectRosterPeople(members, workspace);

  for (const person of people.values()) {
    const id =
      person.organizationUser?.id ??
      (person.organizationMemberId
        ? `roster-member:${person.organizationMemberId}`
        : `roster:${person.dedupeKey}`);
    if (id === memberId) {
      return finalizeUnifiedMember(person, workspace, workload);
    }
  }

  return null;
}

export function memberStatusLabel(
  status: UnifiedMemberStatus,
  isRosterOnly = false,
): string {
  if (isRosterOnly || status === "roster") {
    return "Not Invited";
  }
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Invited";
    case "deactivated":
      return "Inactive";
    default:
      return status;
  }
}

export function accessLevelLabel(
  role: CampaignRole | string,
  _isRosterOnly = false,
  customLabels?: Partial<Record<string, string>> | null,
): string {
  // Role always means Access template label. Login status is separate.
  const custom = customLabels?.[role]?.trim();
  if (custom) {
    return custom;
  }
  if (role === "view_only") {
    return "View Only";
  }
  if (role === "president") {
    return "President";
  }
  if (role === "committee_chair") {
    return "Contributor";
  }
  if (typeof role === "string" && role.startsWith("custom_")) {
    return "Custom role";
  }
  return appAccessLabel(true, role as CampaignRole);
}

export function accessBadgeVariant(
  role: CampaignRole,
): "success" | "info" | "warning" | "default" {
  switch (role) {
    case "admin":
    case "developer":
      return "success";
    case "president":
    case "vp_communications":
      return "info";
    case "committee_chair":
    case "contributor":
    case "tester":
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
