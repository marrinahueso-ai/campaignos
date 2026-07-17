import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { CommitteeAssignmentRole } from "@/lib/organization-workspace/roster-first";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

const RESPONSIBILITY_LABELS: Record<
  CommitteeAssignmentRole,
  string
> = {
  supervising_vp: "Supervisor",
  chair: "Event Lead",
  co_chair: "Assistant Lead",
  member: "Team Member",
};

export interface OrgStructureAssignment {
  organizationMemberId: string;
  committeeId: string;
  role: CommitteeAssignmentRole;
}

export interface OrgStructureEventOption {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
}

export type OrgStructureViewMode = "structure" | "list";

export interface OrgStructurePersonRef {
  memberId: string | null;
  organizationMemberId: string | null;
  displayName: string;
  email: string | null;
  initials: string;
  photoUrl: null;
  accessBadge: string;
  statusLabel: string;
}

export interface LeadershipStructureCard {
  role: OrganizationRole;
  person: OrgStructurePersonRef | null;
  isOpen: boolean;
  reportsTo: string | null;
  supervisedCommittees: OrganizationCommittee[];
}

export interface CommitteeStructureCard {
  committee: OrganizationCommittee;
  supervisor: OrgStructurePersonRef | null;
  supervisorRoleName: string | null;
  eventLead: OrgStructurePersonRef | null;
  assistantLead: OrgStructurePersonRef | null;
  members: OrgStructurePersonRef[];
  memberCount: number;
  assignedEvent: OrgStructureEventOption | null;
  missingEventLead: boolean;
  missingAssistantLead: boolean;
  missingEvent: boolean;
}

export type OpenPositionKind =
  | "leadership"
  | "event_lead"
  | "assistant_lead"
  | "assigned_event";

export interface OpenPositionItem {
  id: string;
  kind: OpenPositionKind;
  label: string;
  detail: string;
  roleId?: string;
  committeeId?: string;
}

export interface OrganizationStructureSummary {
  leadershipRoles: number;
  teamsCommittees: number;
  rosterMembers: number;
  openPositions: number;
  peopleWithAppAccess: number;
}

export interface OrganizationStructureModel {
  summary: OrganizationStructureSummary;
  leadership: LeadershipStructureCard[];
  committees: CommitteeStructureCard[];
  openPositions: OpenPositionItem[];
}

export function responsibilityLabelForRole(
  role: CommitteeAssignmentRole,
): string {
  return RESPONSIBILITY_LABELS[role] ?? role;
}

/** Compact Org-tab access badge — not a permissions matrix. */
export function compactOrgAccessBadge(member: UnifiedTeamMember): string {
  if (member.isRosterOnly || member.status === "roster") {
    return "Roster Only";
  }
  if (member.status === "invited") {
    return "Invited";
  }
  if (member.accessLevel === "president" || member.isPresident) {
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
  if (member.status === "active") {
    return "Active";
  }
  return member.accessLabel || "Active";
}

function personRefFromMember(member: UnifiedTeamMember): OrgStructurePersonRef {
  return {
    memberId: member.id,
    organizationMemberId: member.organizationMemberId,
    displayName: member.displayName,
    email: member.email?.trim() ? member.email : null,
    initials: member.initials,
    photoUrl: null,
    accessBadge: compactOrgAccessBadge(member),
    statusLabel: member.statusLabel,
  };
}

function emptyPersonFromContact(input: {
  name: string | null | undefined;
  email: string | null | undefined;
}): OrgStructurePersonRef | null {
  const name = input.name?.trim();
  if (!name) {
    return null;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return {
    memberId: null,
    organizationMemberId: null,
    displayName: name,
    email: input.email?.trim() || null,
    initials: initials || "?",
    photoUrl: null,
    accessBadge: "Roster Only",
    statusLabel: "Roster Only",
  };
}

function indexMembersByOrganizationMemberId(
  members: UnifiedTeamMember[],
): Map<string, UnifiedTeamMember> {
  const map = new Map<string, UnifiedTeamMember>();
  for (const member of members) {
    if (member.organizationMemberId) {
      map.set(member.organizationMemberId, member);
    }
  }
  return map;
}

function resolvePersonByOrganizationMemberId(
  organizationMemberId: string | null | undefined,
  byOrgMemberId: Map<string, UnifiedTeamMember>,
): OrgStructurePersonRef | null {
  if (!organizationMemberId) {
    return null;
  }
  const member = byOrgMemberId.get(organizationMemberId);
  return member ? personRefFromMember(member) : null;
}

function resolveLeadershipPerson(
  role: OrganizationRole,
  members: UnifiedTeamMember[],
): OrgStructurePersonRef | null {
  const byRole = members.filter(
    (member) => member.organizationRoleId === role.id,
  );
  if (byRole.length > 0) {
    return personRefFromMember(byRole[0]!);
  }

  const email = role.contactEmail?.trim().toLowerCase();
  if (email) {
    const byEmail = members.find(
      (member) => member.email.trim().toLowerCase() === email,
    );
    if (byEmail) {
      return personRefFromMember(byEmail);
    }
  }

  return emptyPersonFromContact({
    name: role.contactName,
    email: role.contactEmail,
  });
}

function assignmentsForCommittee(
  committeeId: string,
  assignments: OrgStructureAssignment[],
): OrgStructureAssignment[] {
  return assignments.filter((row) => row.committeeId === committeeId);
}

function firstAssignmentPerson(
  rows: OrgStructureAssignment[],
  role: CommitteeAssignmentRole,
  byOrgMemberId: Map<string, UnifiedTeamMember>,
): OrgStructurePersonRef | null {
  const match = rows.find((row) => row.role === role);
  return resolvePersonByOrganizationMemberId(
    match?.organizationMemberId,
    byOrgMemberId,
  );
}

function peopleForRole(
  rows: OrgStructureAssignment[],
  role: CommitteeAssignmentRole,
  byOrgMemberId: Map<string, UnifiedTeamMember>,
): OrgStructurePersonRef[] {
  return rows
    .filter((row) => row.role === role)
    .map((row) =>
      resolvePersonByOrganizationMemberId(
        row.organizationMemberId,
        byOrgMemberId,
      ),
    )
    .filter((person): person is OrgStructurePersonRef => Boolean(person));
}

export function buildOrganizationStructureModel(input: {
  workspace: OrganizationWorkspaceData;
  members: UnifiedTeamMember[];
  assignments: OrgStructureAssignment[];
  events: OrgStructureEventOption[];
}): OrganizationStructureModel {
  const activeRoles = input.workspace.roles
    .filter((role) => !role.archivedAt)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const activeCommittees = input.workspace.committees
    .filter((committee) => !committee.archivedAt)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const byOrgMemberId = indexMembersByOrganizationMemberId(input.members);
  const eventsById = new Map(input.events.map((event) => [event.id, event]));

  const president = activeRoles.find((role) => role.roleKind === "president");
  const presidentPerson = president
    ? resolveLeadershipPerson(president, input.members)
    : null;

  const leadership: LeadershipStructureCard[] = activeRoles.map((role) => {
    const person = resolveLeadershipPerson(role, input.members);
    const supervisedCommittees = activeCommittees.filter(
      (committee) => committee.parentRoleId === role.id,
    );
    let reportsTo: string | null = null;
    if (role.roleKind !== "president" && president) {
      reportsTo = presidentPerson?.displayName ?? president.name;
    }

    return {
      role,
      person,
      isOpen: !person,
      reportsTo,
      supervisedCommittees,
    };
  });

  const committees: CommitteeStructureCard[] = activeCommittees.map(
    (committee) => {
      const rows = assignmentsForCommittee(committee.id, input.assignments);
      const parentRole = activeRoles.find(
        (role) => role.id === committee.parentRoleId,
      );
      const supervisorFromAssignment = firstAssignmentPerson(
        rows,
        "supervising_vp",
        byOrgMemberId,
      );
      const supervisorFromParent = parentRole
        ? resolveLeadershipPerson(parentRole, input.members)
        : null;
      const supervisor = supervisorFromAssignment ?? supervisorFromParent;
      const eventLead = firstAssignmentPerson(rows, "chair", byOrgMemberId);
      const assistantLead = firstAssignmentPerson(
        rows,
        "co_chair",
        byOrgMemberId,
      );
      const members = peopleForRole(rows, "member", byOrgMemberId);
      const uniqueIds = new Set(
        rows
          .map((row) => row.organizationMemberId)
          .filter(Boolean),
      );
      const assignedEvent = committee.assignedEventId
        ? (eventsById.get(committee.assignedEventId) ?? {
            id: committee.assignedEventId,
            title: "Assigned event",
          })
        : null;

      return {
        committee,
        supervisor,
        supervisorRoleName: parentRole?.name ?? null,
        eventLead,
        assistantLead,
        members,
        memberCount: uniqueIds.size,
        assignedEvent,
        missingEventLead: !eventLead,
        missingAssistantLead: !assistantLead,
        missingEvent: !committee.assignedEventId,
      };
    },
  );

  const openPositions: OpenPositionItem[] = [];

  for (const card of leadership) {
    if (card.isOpen) {
      openPositions.push({
        id: `leadership:${card.role.id}`,
        kind: "leadership",
        label: card.role.name,
        detail: "Leadership role without a person",
        roleId: card.role.id,
      });
    }
  }

  for (const card of committees) {
    if (card.missingEventLead) {
      openPositions.push({
        id: `event_lead:${card.committee.id}`,
        kind: "event_lead",
        label: `${card.committee.name} — Event Lead`,
        detail: "Committee without Event Lead",
        committeeId: card.committee.id,
      });
    }
    if (card.missingAssistantLead) {
      openPositions.push({
        id: `assistant_lead:${card.committee.id}`,
        kind: "assistant_lead",
        label: `${card.committee.name} — Assistant Lead`,
        detail: "Committee without Assistant Lead",
        committeeId: card.committee.id,
      });
    }
    if (card.missingEvent) {
      openPositions.push({
        id: `assigned_event:${card.committee.id}`,
        kind: "assigned_event",
        label: `${card.committee.name} — Assigned Event`,
        detail: "Committee without assigned event",
        committeeId: card.committee.id,
      });
    }
  }

  const peopleWithAppAccess = input.members.filter(
    (member) =>
      !member.isRosterOnly &&
      (member.status === "active" || member.status === "invited"),
  ).length;

  return {
    summary: {
      leadershipRoles: leadership.length,
      teamsCommittees: committees.length,
      rosterMembers: input.members.length,
      openPositions: openPositions.length,
      peopleWithAppAccess,
    },
    leadership,
    committees,
    openPositions,
  };
}

export function filterOrganizationStructureModel(
  model: OrganizationStructureModel,
  filters: {
    search: string;
    supervisorRoleId: string;
    committeeId: string;
    openPositionsOnly: boolean;
    appAccess: string;
  },
): OrganizationStructureModel {
  const search = filters.search.trim().toLowerCase();

  const matchesSearch = (parts: Array<string | null | undefined>) => {
    if (!search) {
      return true;
    }
    return parts.some((part) => part?.toLowerCase().includes(search));
  };

  const matchesAppAccess = (person: OrgStructurePersonRef | null) => {
    if (!filters.appAccess) {
      return true;
    }
    if (!person) {
      return filters.appAccess === "open";
    }
    return person.accessBadge === filters.appAccess;
  };

  let leadership = model.leadership.filter((card) => {
    if (filters.openPositionsOnly && !card.isOpen) {
      return false;
    }
    if (filters.committeeId) {
      return card.supervisedCommittees.some(
        (committee) => committee.id === filters.committeeId,
      );
    }
    if (
      filters.supervisorRoleId &&
      card.role.id !== filters.supervisorRoleId
    ) {
      return false;
    }
    if (!matchesAppAccess(card.person)) {
      return false;
    }
    return matchesSearch([
      card.role.name,
      card.person?.displayName,
      card.person?.email,
      card.reportsTo,
      ...card.supervisedCommittees.map((committee) => committee.name),
    ]);
  });

  const committees = model.committees.filter((card) => {
    if (filters.committeeId && card.committee.id !== filters.committeeId) {
      return false;
    }
    if (
      filters.supervisorRoleId &&
      card.committee.parentRoleId !== filters.supervisorRoleId
    ) {
      return false;
    }
    if (filters.openPositionsOnly) {
      const isOpen =
        card.missingEventLead ||
        card.missingAssistantLead ||
        card.missingEvent;
      if (!isOpen) {
        return false;
      }
    }
    if (
      filters.appAccess &&
      ![card.supervisor, card.eventLead, card.assistantLead, ...card.members].some(
        (person) => matchesAppAccess(person),
      )
    ) {
      return false;
    }
    return matchesSearch([
      card.committee.name,
      card.supervisor?.displayName,
      card.eventLead?.displayName,
      card.assistantLead?.displayName,
      card.assignedEvent?.title,
      card.supervisorRoleName,
      ...card.members.map((member) => member.displayName),
    ]);
  });

  if (filters.openPositionsOnly || search || filters.committeeId) {
    // Keep leadership that still supervise visible committees when filtering committees.
    if (filters.committeeId || filters.openPositionsOnly || search) {
      const keptRoleIds = new Set(
        committees
          .map((card) => card.committee.parentRoleId)
          .filter((id): id is string => Boolean(id)),
      );
      if (!filters.supervisorRoleId) {
        leadership = model.leadership.filter(
          (card) =>
            leadership.some((kept) => kept.role.id === card.role.id) ||
            keptRoleIds.has(card.role.id),
        );
      }
    }
  }

  const openPositions = model.openPositions.filter((item) => {
    if (filters.committeeId && item.committeeId !== filters.committeeId) {
      return false;
    }
    if (filters.supervisorRoleId) {
      const committee = model.committees.find(
        (card) => card.committee.id === item.committeeId,
      );
      if (item.kind === "leadership") {
        return item.roleId === filters.supervisorRoleId;
      }
      return committee?.committee.parentRoleId === filters.supervisorRoleId;
    }
    return matchesSearch([item.label, item.detail]);
  });

  return {
    summary: model.summary,
    leadership,
    committees,
    openPositions: filters.openPositionsOnly
      ? openPositions
      : filters.search || filters.committeeId || filters.supervisorRoleId
        ? openPositions
        : model.openPositions.filter((item) =>
            matchesSearch([item.label, item.detail]),
          ),
  };
}

export function sortCommitteeCards(
  cards: CommitteeStructureCard[],
  sort: "name" | "supervisor" | "members" | "open",
): CommitteeStructureCard[] {
  const copy = cards.slice();
  switch (sort) {
    case "supervisor":
      return copy.sort((a, b) =>
        (a.supervisor?.displayName ?? "Not Assigned").localeCompare(
          b.supervisor?.displayName ?? "Not Assigned",
        ),
      );
    case "members":
      return copy.sort((a, b) => b.memberCount - a.memberCount);
    case "open":
      return copy.sort((a, b) => {
        const aOpen =
          Number(a.missingEventLead) +
          Number(a.missingAssistantLead) +
          Number(a.missingEvent);
        const bOpen =
          Number(b.missingEventLead) +
          Number(b.missingAssistantLead) +
          Number(b.missingEvent);
        return bOpen - aOpen || a.committee.name.localeCompare(b.committee.name);
      });
    case "name":
    default:
      return copy.sort((a, b) =>
        a.committee.name.localeCompare(b.committee.name),
      );
  }
}

export function campaignRoleToCompactBadge(
  role: CampaignRole,
  isRosterOnly: boolean,
): string {
  if (isRosterOnly) {
    return "Roster Only";
  }
  switch (role) {
    case "president":
      return "President";
    case "admin":
      return "Admin";
    case "developer":
      return "Developer";
    case "tester":
      return "Tester";
    case "view_only":
      return "View Only";
    default:
      return "Contributor";
  }
}
