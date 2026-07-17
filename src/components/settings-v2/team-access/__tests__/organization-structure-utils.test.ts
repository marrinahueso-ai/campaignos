import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrganizationStructureModel,
  compactOrgAccessBadge,
  filterOrganizationStructureModel,
  responsibilityLabelForRole,
  sortCommitteeCards,
  type OrgStructureAssignment,
} from "@/components/settings-v2/team-access/organization-structure-utils";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

function makeMember(
  overrides: Partial<UnifiedTeamMember> &
    Pick<UnifiedTeamMember, "id" | "displayName">,
): UnifiedTeamMember {
  return {
    email: "",
    emailMissing: true,
    phone: null,
    phoneMissing: true,
    initials: "AB",
    orgRoleLabel: "Roster contact",
    roleLabel: "Roster contact",
    accessLabel: "No app access",
    accessLevel: "view_only",
    vpPortfolio: null,
    vpPortfolioId: null,
    committeeCount: 0,
    committees: [],
    vpOversightCommittees: [],
    status: "roster",
    statusLabel: "Roster only — no app access",
    isRosterOnly: true,
    lastActive: null,
    joinedAt: null,
    organizationRoleId: null,
    organizationRoleName: null,
    organizationMemberId: null,
    assignedEventIds: [],
    reportsTo: null,
    teamMemberCount: 0,
    isVp: false,
    isPresident: false,
    hasRoleOversight: false,
    openTasks: 0,
    campaigns: 0,
    approvalsWaiting: 0,
    totalCommittees: 0,
    totalCommitteeMembers: 0,
    openCommitteeRoles: 0,
    raw: null,
    ...overrides,
  };
}

const workspace: OrganizationWorkspaceData = {
  roles: [
    {
      id: "role-president",
      organizationId: "org-1",
      name: "President",
      systemRole: true,
      description: null,
      contactEmail: "president@school.org",
      contactPhone: null,
      contactName: "Pat President",
      roleKind: "president",
      sortOrder: 0,
      archivedAt: null,
      campaignRole: "president",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "role-vp",
      organizationId: "org-1",
      name: "VP Programs",
      systemRole: false,
      description: null,
      contactEmail: null,
      contactPhone: null,
      contactName: null,
      roleKind: "vp",
      sortOrder: 1,
      archivedAt: null,
      campaignRole: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  members: [],
  responsibilityMatrix: [],
  committeeDefaults: [],
  committees: [
    {
      id: "committee-bookfair",
      organizationId: "org-1",
      name: "Book Fair",
      parentRoleId: "role-vp",
      parentRoleName: "VP Programs",
      contactEmail: null,
      contactPhone: null,
      contactName: null,
      communicationStrategy: "full_campaign",
      playbookSlug: null,
      eventMatchKey: null,
      assignedEventId: "event-1",
      sortOrder: 0,
      archivedAt: null,
      campaignRole: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "committee-open",
      organizationId: "org-1",
      name: "Open Team",
      parentRoleId: "role-vp",
      parentRoleName: "VP Programs",
      contactEmail: null,
      contactPhone: null,
      contactName: null,
      communicationStrategy: "full_campaign",
      playbookSlug: null,
      eventMatchKey: null,
      assignedEventId: null,
      sortOrder: 1,
      archivedAt: null,
      campaignRole: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("organization-structure-utils", () => {
  it("maps responsibility labels exactly", () => {
    assert.equal(responsibilityLabelForRole("supervising_vp"), "Supervisor");
    assert.equal(responsibilityLabelForRole("chair"), "Event Lead");
    assert.equal(responsibilityLabelForRole("co_chair"), "Assistant Lead");
    assert.equal(responsibilityLabelForRole("member"), "Team Member");
  });

  it("builds real counts and open positions without inventing assignments", () => {
    const members = [
      makeMember({
        id: "user-president",
        displayName: "Pat President",
        email: "president@school.org",
        emailMissing: false,
        organizationRoleId: "role-president",
        organizationMemberId: "om-president",
        isPresident: true,
        isRosterOnly: false,
        status: "active",
        statusLabel: "Active",
        accessLevel: "president",
        accessLabel: "Admin",
      }),
      makeMember({
        id: "roster-chair",
        displayName: "Chris Chair",
        organizationMemberId: "om-chair",
      }),
    ];

    const assignments: OrgStructureAssignment[] = [
      {
        organizationMemberId: "om-chair",
        committeeId: "committee-bookfair",
        role: "chair",
      },
    ];

    const model = buildOrganizationStructureModel({
      workspace,
      members,
      assignments,
      events: [{ id: "event-1", title: "Spring Book Fair" }],
    });

    assert.equal(model.summary.leadershipRoles, 2);
    assert.equal(model.summary.teamsCommittees, 2);
    assert.equal(model.summary.rosterMembers, 2);
    assert.equal(model.summary.peopleWithAppAccess, 1);
    assert.ok(model.summary.openPositions > 0);

    const vp = model.leadership.find((card) => card.role.id === "role-vp");
    assert.equal(vp?.isOpen, true);
    assert.equal(vp?.reportsTo, "Pat President");

    const bookFair = model.committees.find(
      (card) => card.committee.id === "committee-bookfair",
    );
    assert.equal(bookFair?.eventLead?.displayName, "Chris Chair");
    assert.equal(bookFair?.assistantLead, null);
    assert.equal(bookFair?.assignedEvent?.title, "Spring Book Fair");
    assert.equal(bookFair?.missingEventLead, false);
    assert.equal(bookFair?.missingAssistantLead, true);

    const openTeam = model.committees.find(
      (card) => card.committee.id === "committee-open",
    );
    assert.equal(openTeam?.eventLead, null);
    assert.equal(openTeam?.missingEvent, true);

    assert.ok(
      model.openPositions.some((item) => item.id === "leadership:role-vp"),
    );
    assert.ok(
      model.openPositions.some(
        (item) => item.id === "assistant_lead:committee-bookfair",
      ),
    );
  });

  it("filters by search and open positions", () => {
    const model = buildOrganizationStructureModel({
      workspace,
      members: [
        makeMember({
          id: "user-president",
          displayName: "Pat President",
          email: "president@school.org",
          organizationRoleId: "role-president",
          organizationMemberId: "om-president",
          isPresident: true,
          isRosterOnly: false,
          status: "active",
          accessLevel: "president",
        }),
      ],
      assignments: [],
      events: [],
    });

    const filtered = filterOrganizationStructureModel(model, {
      search: "book",
      supervisorRoleId: "",
      committeeId: "",
      openPositionsOnly: false,
      appAccess: "",
    });
    assert.equal(filtered.committees.length, 1);
    assert.equal(filtered.committees[0]?.committee.name, "Book Fair");

    const openOnly = filterOrganizationStructureModel(model, {
      search: "",
      supervisorRoleId: "",
      committeeId: "",
      openPositionsOnly: true,
      appAccess: "",
    });
    assert.ok(openOnly.leadership.every((card) => card.isOpen || card.role.id));
    assert.ok(openOnly.openPositions.length > 0);
  });

  it("sorts committee cards by open roles", () => {
    const model = buildOrganizationStructureModel({
      workspace,
      members: [],
      assignments: [
        {
          organizationMemberId: "om-chair",
          committeeId: "committee-bookfair",
          role: "chair",
        },
        {
          organizationMemberId: "om-co",
          committeeId: "committee-bookfair",
          role: "co_chair",
        },
      ],
      events: [{ id: "event-1", title: "Spring Book Fair" }],
    });

    const sorted = sortCommitteeCards(model.committees, "open");
    assert.equal(sorted[0]?.committee.id, "committee-open");
  });

  it("uses compact access badges", () => {
    assert.equal(
      compactOrgAccessBadge(
        makeMember({
          id: "1",
          displayName: "A",
          isRosterOnly: true,
          status: "roster",
        }),
      ),
      "Roster Only",
    );
    assert.equal(
      compactOrgAccessBadge(
        makeMember({
          id: "2",
          displayName: "B",
          isRosterOnly: false,
          status: "invited",
          accessLevel: "contributor",
        }),
      ),
      "Invited",
    );
    assert.equal(
      compactOrgAccessBadge(
        makeMember({
          id: "3",
          displayName: "C",
          isRosterOnly: false,
          status: "active",
          accessLevel: "view_only",
        }),
      ),
      "View Only",
    );
    assert.equal(
      compactOrgAccessBadge(
        makeMember({
          id: "4",
          displayName: "D",
          isRosterOnly: false,
          status: "active",
          accessLevel: "president",
          isPresident: true,
        }),
      ),
      "President",
    );
  });
});
