import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildUnifiedTeamMembers } from "../team-access-utils.ts";
import type { OrganizationWorkspaceData } from "../../../../types/organization-workspace.ts";

const PRESIDENT_ROLE_ID = "291265da-310c-41e6-8ed8-bd386d3bdc5c";
const SECRETARY_ROLE_ID = "09efb273-7f51-46ce-b62a-2b90b3982b9f";
const VP_EVENTS_ROLE_ID = "18bd7f90-c244-4725-9791-9d0e609dc05f";

function committee(
  id: string,
  name: string,
  parentRoleId: string,
  parentRoleName: string,
  contactName: string | null = null,
): OrganizationWorkspaceData["committees"][number] {
  return {
    id,
    organizationId: "org-1",
    name,
    parentRoleId,
    parentRoleName,
    contactEmail: null,
    contactPhone: null,
    contactName,
    communicationStrategy: "full_campaign",
    playbookSlug: null,
    eventMatchKey: null,
    assignedEventId: null,
    sortOrder: 0,
    archivedAt: null,
    campaignRole: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const workspaceFixture: OrganizationWorkspaceData = {
  roles: [
    {
      id: PRESIDENT_ROLE_ID,
      organizationId: "org-1",
      name: "President",
      systemRole: false,
      description: null,
      contactEmail: null,
      contactPhone: null,
      contactName: "Rebecca Kidd",
      roleKind: "president",
      sortOrder: 0,
      archivedAt: null,
      campaignRole: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: SECRETARY_ROLE_ID,
      organizationId: "org-1",
      name: "Secretary",
      systemRole: false,
      description: null,
      contactEmail: null,
      contactPhone: null,
      contactName: "Molly Crosby",
      roleKind: "other",
      sortOrder: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: VP_EVENTS_ROLE_ID,
      organizationId: "org-1",
      name: "VP Events",
      systemRole: false,
      description: null,
      contactEmail: null,
      contactPhone: null,
      contactName: "Megan Plagman",
      roleKind: "vp",
      sortOrder: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  members: [],
  responsibilityMatrix: [],
  committeeDefaults: [],
  committees: [
    committee("c1", "BooHoo Yahoo Breakfast", PRESIDENT_ROLE_ID, "President", "Colleen Stewart, Laura Stoner"),
    committee("c2", "New Families", PRESIDENT_ROLE_ID, "President", "Julie Gamboa"),
    committee("c3", "Room Parent Coordinator", PRESIDENT_ROLE_ID, "President", "Diane Perry"),
    committee("c4", "Back To School Fair", PRESIDENT_ROLE_ID, "President"),
    committee("c5", "E-Buck Exchange", PRESIDENT_ROLE_ID, "President", "Jessica Langdon, Michelle Lafalette"),
    committee("c6", "Campus Beautification", PRESIDENT_ROLE_ID, "President", "Jessica Langdon"),
    committee("c7", "School Supplies", PRESIDENT_ROLE_ID, "President", "John Kidd, Michelle Lafalette"),
    committee("c8", "Kindergarten Sneak A Peek", PRESIDENT_ROLE_ID, "President", "Michelle Lafalette"),
    committee("c9", "Volunteer Badges", SECRETARY_ROLE_ID, "Secretary", "Lauren Spiceland"),
    committee("c10", "Bus Driver Breakfast", SECRETARY_ROLE_ID, "Secretary", "Kelly Montgomery"),
    committee(
      "c11",
      "Fall Family Event",
      VP_EVENTS_ROLE_ID,
      "VP Events",
      "Rebecca\u00a0Kidd",
    ),
  ],
};

describe("buildUnifiedTeamMembers committee mapping", () => {
  it("maps president portfolio committees for Rebecca Kidd", () => {
    const members = buildUnifiedTeamMembers([], workspaceFixture);
    const rebecca = members.find((member) => member.displayName === "Rebecca Kidd");

    assert.ok(rebecca, "expected Rebecca Kidd in unified members");
    assert.equal(rebecca.isPresident, true);
    assert.equal(rebecca.hasRoleOversight, true);
    assert.equal(rebecca.committeeCount, 9);
    assert.equal(
      rebecca.committees.filter((assignment) => assignment.roleOnCommittee === "vp").length,
      8,
    );
    assert.ok(
      rebecca.committees.some(
        (assignment) =>
          assignment.committee.name === "Fall Family Event" &&
          assignment.roleOnCommittee === "chair",
      ),
    );
  });

  it("maps secretary portfolio committees for Molly Crosby", () => {
    const members = buildUnifiedTeamMembers([], workspaceFixture);
    const molly = members.find((member) => member.displayName === "Molly Crosby");

    assert.ok(molly, "expected Molly Crosby in unified members");
    assert.equal(molly.hasRoleOversight, true);
    assert.equal(molly.committeeCount, 2);
    assert.deepEqual(
      molly.committees.map((assignment) => assignment.committee.name).sort(),
      ["Bus Driver Breakfast", "Volunteer Badges"],
    );
  });
});
