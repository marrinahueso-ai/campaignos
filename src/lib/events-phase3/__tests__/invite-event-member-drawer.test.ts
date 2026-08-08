import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("InviteEventMemberDrawer contracts", () => {
  const drawer = readSrc(
    "../../../components/events-phase3/InviteEventMemberDrawer.tsx",
  );
  const actions = readSrc("../invite-event-member-actions.ts");
  const client = readSrc(
    "../../../components/events-phase3/EventDetailPhase3Client.tsx",
  );
  const teamPanel = readSrc(
    "../../../components/events-phase3/EventDetailTeamEasePanel.tsx",
  );

  it("opens as a right-side drawer with Escape and Pilot copy", () => {
    assert.match(drawer, /max-w-\[440px\]/);
    assert.match(drawer, /Invite team member/);
    assert.match(drawer, /Event Access/);
    assert.match(drawer, /Send invite/);
    assert.match(drawer, /Add to this event/);
    assert.match(drawer, /Invitation sent/);
    assert.match(drawer, /Manage advanced access/);
    assert.match(drawer, /settings\/team-access/);
    assert.match(drawer, /event\.key === "Escape"/);
    assert.match(drawer, /data-testid="invite-event-member-drawer"/);
  });

  it("reuses inviteTeamMemberAction and merges event assignments", () => {
    assert.match(actions, /inviteTeamMemberAction/);
    assert.match(actions, /eventIdsCsv/);
    assert.match(actions, /Already on your team|already an active|already on your team/i);
    assert.match(actions, /replaceOrganizationUserEventAssignments/);
    assert.match(actions, /mergeEventAssignmentIds/);
    assert.match(actions, /requirePermission\("manage_people"\)/);
    assert.match(actions, /status === "active"/);
  });

  it("wires drawer from Event ID client without loading roster on page load", () => {
    assert.match(client, /InviteEventMemberDrawer/);
    assert.match(client, /onInviteTeamMember/);
    assert.match(client, /inviteOpen/);
    assert.match(client, /event\.date/);
    assert.match(client, /artwork\?\.imageUrl/);
    assert.doesNotMatch(client, /loadInviteEventMemberRolesAction/);
    assert.match(teamPanel, /Invite team member/);
    assert.match(teamPanel, /onInviteTeamMember/);
  });

  it("does not overwrite org role when adding an existing member", () => {
    assert.match(actions, /addExistingMemberToEventAction/);
    assert.doesNotMatch(
      actions,
      /updateOrganizationMembership\([\s\S]*campaignRole/,
    );
    assert.match(
      actions,
      /Only active team members can be added directly to an event/,
    );
  });
});
