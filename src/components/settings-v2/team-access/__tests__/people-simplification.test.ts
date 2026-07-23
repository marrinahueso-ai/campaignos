import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPersonEventInvolvements,
  buildUnifiedTeamMembers,
  canResendTeamInvite,
  memberMatchesPeopleSearch,
  memberStatusLabel,
  peopleAccessBadgeLabel,
  peopleLoginStatus,
  peopleLoginStatusLabel,
  peopleRelatedEventIds,
  peopleResponsibilityLabel,
  resendTeamInviteLabel,
} from "../team-access-utils.ts";
import type { OrganizationWorkspaceData } from "../../../../types/organization-workspace.ts";
import type { OrganizationUser } from "../../../../types/auth.ts";

const here = dirname(fileURLToPath(import.meta.url));
const shellSource = readFileSync(join(here, "../TeamAccessShell.tsx"), "utf8");
const tableSource = readFileSync(join(here, "../TeamAccessMemberTable.tsx"), "utf8");
const profileSource = readFileSync(
  join(here, "../TeamAccessPersonProfile.tsx"),
  "utf8",
);

function orgUser(
  overrides: Partial<OrganizationUser> &
    Pick<OrganizationUser, "id" | "email" | "displayName" | "campaignRole" | "status">,
): OrganizationUser {
  return {
    organizationId: "org-1",
    userId: null,
    organizationRoleId: null,
    organizationRoleName: null,
    organizationMemberId: null,
    committeeId: null,
    inviteMessage: null,
    inviteToken: null,
    invitedAt: null,
    joinedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    assignedEventIds: [],
    ...overrides,
  };
}

function workspaceWithBookFair(): OrganizationWorkspaceData {
  return {
    roles: [
      {
        id: "role-pres",
        organizationId: "org-1",
        name: "President",
        systemRole: true,
        description: null,
        contactEmail: null,
        contactPhone: null,
        contactName: "Pat President",
        roleKind: "president",
        sortOrder: 0,
        archivedAt: null,
        campaignRole: "president",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    members: [
      {
        id: "om-julie",
        organizationId: "org-1",
        name: "Julie Gamboa",
        email: "julie@school.org",
        phone: "555-0100",
        organizationRoleId: null,
        roleName: null,
        active: true,
        campaignRole: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        assignedEventIds: ["event-book-fair"],
      },
      {
        id: "om-chair",
        organizationId: "org-1",
        name: "Chris Chair",
        email: "chris@school.org",
        phone: null,
        organizationRoleId: null,
        roleName: null,
        active: true,
        campaignRole: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        assignedEventIds: ["event-book-fair"],
      },
    ],
    responsibilityMatrix: [],
    committeeDefaults: [],
    committees: [
      {
        id: "committee-bookfair",
        organizationId: "org-1",
        name: "Book Fair Team",
        parentRoleId: "role-pres",
        parentRoleName: "President",
        contactEmail: null,
        contactPhone: null,
        contactName: "Chris Chair",
        communicationStrategy: "full_campaign",
        playbookSlug: null,
        eventMatchKey: null,
        assignedEventId: "event-book-fair",
        sortOrder: 0,
        archivedAt: null,
        campaignRole: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

const orgUsers: OrganizationUser[] = [
  orgUser({
    id: "user-active",
    email: "alice@school.org",
    displayName: "Alice Nguyen",
    campaignRole: "contributor",
    status: "active",
  }),
  orgUser({
    id: "user-invited",
    email: "bob@school.org",
    displayName: "Bob Patel",
    campaignRole: "view_only",
    status: "invited",
  }),
  orgUser({
    id: "user-inactive",
    email: "carol@school.org",
    displayName: "Carol Diaz",
    campaignRole: "contributor",
    status: "deactivated",
  }),
];

describe("Team & Access people simplification", () => {
  it("1. Organization tab no longer appears in TeamAccessShell", () => {
    assert.doesNotMatch(shellSource, /Organization Structure/);
    assert.doesNotMatch(shellSource, /pageTab/);
    assert.doesNotMatch(shellSource, /setPageTab/);
    assert.match(shellSource, /People & Responsibilities/);
  });

  it("2-5. Person, role, event, and login-status search work", () => {
    const workspace = workspaceWithBookFair();
    const members = buildUnifiedTeamMembers([], workspace);
    const eventTitles = new Map([["event-book-fair", "Book Fair"]]);

    const julie = members.find((member) => member.displayName === "Julie Gamboa");
    assert.ok(julie);
    assert.equal(memberMatchesPeopleSearch(julie, "Julie", eventTitles), true);
    assert.equal(
      memberMatchesPeopleSearch(julie, "Book Fair", eventTitles),
      true,
    );

    const chris = members.find((member) => member.displayName === "Chris Chair");
    assert.ok(chris);
    assert.equal(chris.orgRoleLabel, "Event Lead");
    assert.equal(
      memberMatchesPeopleSearch(chris, "Event Lead", eventTitles),
      true,
    );
    assert.equal(
      memberMatchesPeopleSearch(chris, "President", eventTitles),
      false,
    );

    const president = members.find((member) => member.displayName === "Pat President");
    assert.ok(president);
    assert.equal(
      memberMatchesPeopleSearch(president, "President", eventTitles),
      true,
    );

    const emptyWorkspace: OrganizationWorkspaceData = {
      roles: [],
      members: [],
      responsibilityMatrix: [],
      committeeDefaults: [],
      committees: [],
    };
    const withLogins = buildUnifiedTeamMembers(orgUsers, emptyWorkspace);
    assert.equal(withLogins.length, 3);
    const active = withLogins.find((member) => member.email === "alice@school.org");
    assert.ok(active);
    assert.equal(memberMatchesPeopleSearch(active, "Active", eventTitles), true);
    assert.equal(memberMatchesPeopleSearch(active, "Alice", eventTitles), true);
  });

  it("6. Committee terminology is not displayed in People table UI", () => {
    assert.doesNotMatch(tableSource, /Committee/i);
    assert.doesNotMatch(tableSource, /Roster Only/);
    assert.doesNotMatch(tableSource, /App Access/);
    assert.match(tableSource, /Login Status/);
    assert.match(tableSource, /Assigned Events/);
  });

  it("7-10. Login status mapping for roster/invited/active/inactive", () => {
    const workspace = workspaceWithBookFair();
    const rosterMembers = buildUnifiedTeamMembers([], workspace);
    const julie = rosterMembers.find((member) => member.displayName === "Julie Gamboa");
    assert.ok(julie);
    assert.equal(peopleLoginStatus(julie), "not_invited");
    assert.equal(peopleLoginStatusLabel("not_invited"), "Not Invited");
    assert.equal(memberStatusLabel("roster", true), "Not Invited");
    assert.doesNotMatch(julie.statusLabel, /Roster Only/i);

    const withLogins = buildUnifiedTeamMembers(orgUsers, {
      roles: [],
      members: [],
      responsibilityMatrix: [],
      committeeDefaults: [],
      committees: [],
    });

    const invited = withLogins.find((member) => member.email === "bob@school.org");
    const active = withLogins.find((member) => member.email === "alice@school.org");
    const inactive = withLogins.find((member) => member.email === "carol@school.org");
    assert.ok(invited && active && inactive);
    assert.equal(peopleLoginStatus(invited), "invited");
    assert.equal(peopleLoginStatus(active), "active");
    assert.equal(peopleLoginStatus(inactive), "inactive");
    assert.equal(peopleAccessBadgeLabel(active), "Contributor");

    assert.equal(canResendTeamInvite(invited, true), true);
    assert.equal(canResendTeamInvite(inactive, true), true);
    assert.equal(canResendTeamInvite(active, true), false);
    assert.equal(canResendTeamInvite(invited, false), false);
    assert.equal(resendTeamInviteLabel(invited), "Resend Invite");
    assert.equal(resendTeamInviteLabel(inactive), "Reinvite to Login");
  });

  it("11. Assigned Events shows name for one event, count for many", () => {
    assert.match(tableSource, /peopleRelatedEventIds/);
    assert.match(tableSource, /ids\.length === 1/);
    assert.match(tableSource, /\{ids\.length\}/);
    assert.match(tableSource, /href=\{`\/events\/\$\{eventId\}`\}/);
  });

  it("11b. Related events include role-linked event ids", () => {
    const workspace = workspaceWithBookFair();
    const julie = buildUnifiedTeamMembers([], workspace).find(
      (member) => member.displayName === "Julie Gamboa",
    );
    assert.ok(julie);
    assert.deepEqual(peopleRelatedEventIds(julie), ["event-book-fair"]);
  });

  it("12. Person Profile wording is updated", () => {
    assert.match(profileSource, /Not Invited/);
    assert.match(profileSource, /Not invited to login yet/);
    assert.match(profileSource, /Login & Access/);
    assert.match(profileSource, /Invite to Login/);
    assert.match(profileSource, /Assigned Events/);
    assert.match(profileSource, /Contact & reporting/);
    assert.doesNotMatch(profileSource, /Roster Only/);
    assert.doesNotMatch(profileSource, /Give App Access/);
    assert.doesNotMatch(profileSource, /Committee Chair/);
    assert.doesNotMatch(profileSource, /About This Person/);
    assert.doesNotMatch(profileSource, /Quick Actions/);
  });

  it("12b. Person Profile Events tab is one Event ID + role list", () => {
    const shellProfileSource = readFileSync(
      join(here, "../TeamAccessPersonProfileShell.tsx"),
      "utf8",
    );
    assert.match(profileSource, /buildPersonEventInvolvements/);
    assert.match(profileSource, /Needs event link/);
    assert.match(profileSource, /EventSearchPicker/);
    assert.match(profileSource, /Search by event name or date/);
    assert.match(profileSource, /Type a name or date to find the matching event/);
    assert.match(profileSource, /removingEventId !== null/);
    assert.doesNotMatch(profileSource, /Roles on Events/);
    assert.doesNotMatch(profileSource, /Add or remove Event IDs/);
    assert.doesNotMatch(
      profileSource,
      /\{ id: "responsibilities", label: "Responsibilities" \}/,
    );
    assert.match(shellProfileSource, /value === "responsibilities"/);
    assert.match(shellProfileSource, /return "events"/);
    assert.match(shellProfileSource, /onLinkCommitteeEvent/);
  });

  it("12c. Person Profile can remove assigned events from the Events tab", () => {
    assert.match(profileSource, /handleRemoveEventInvolvement/);
    assert.match(profileSource, /onRemoveEventInvolvement/);
    assert.match(profileSource, /Remove/);
    const shellProfileSource = readFileSync(
      join(here, "../TeamAccessPersonProfileShell.tsx"),
      "utf8",
    );
    assert.match(shellProfileSource, /removeRosterCommitteeAssignmentAction/);
  });

  it("12d. Involvements prefer Event ID + role; unlinked roles need a link", () => {
    const workspace = workspaceWithBookFair();
    const chris = buildUnifiedTeamMembers([], workspace).find(
      (member) => member.displayName === "Chris Chair",
    );
    assert.ok(chris);
    const titles = new Map([["event-book-fair", "Book Fair"]]);
    const involvements = buildPersonEventInvolvements(chris, titles);
    assert.equal(involvements.length >= 1, true);
    assert.equal(involvements[0]?.eventId, "event-book-fair");
    assert.equal(involvements[0]?.roleLabel, "Event Lead");
    assert.equal(involvements[0]?.needsEventLink, false);
  });

  it("13. Invite/edit/event-assignment actions still wired in shell", () => {
    assert.match(shellSource, /TeamAccessInviteModal/);
    assert.match(shellSource, /Invite person/);
    assert.doesNotMatch(shellSource, /TeamAccessAddRosterPersonModal/);
    assert.doesNotMatch(shellSource, /Add Person/);
    assert.match(shellSource, /TeamAccessEditMemberModal/);
    assert.match(shellSource, /Manage Event Assignments|openPersonProfile\(moreActionsMember, "events"\)/);
  });

  it("13b. Access templates tab is available without removing People hub", () => {
    assert.match(shellSource, /Access templates/);
    assert.match(shellSource, /TeamAccessAccessTemplatesPanel/);
    assert.match(shellSource, /access_templates/);
    assert.match(shellSource, /hubTab === "people"/);
    const panelSource = readFileSync(
      join(here, "../TeamAccessAccessTemplatesPanel.tsx"),
      "utf8",
    );
    assert.match(panelSource, /\+ Add role/);
    assert.match(panelSource, /createOrganizationAccessTemplateAction/);
    assert.match(panelSource, /Save template/);
  });

  it("14-15. Responsibility labels translate without deleting backend roles", () => {
    assert.equal(peopleResponsibilityLabel("chair"), "Event Lead");
    assert.equal(peopleResponsibilityLabel("co_chair"), "Assistant Lead");
    assert.equal(peopleResponsibilityLabel("member"), "Team Member");
    assert.equal(peopleResponsibilityLabel("supervising_vp"), "Supervisor");
    // Backend role id strings remain in source for assignment wiring.
    assert.match(shellSource, /committees=\{workspace\.committees\}/);
  });
});
