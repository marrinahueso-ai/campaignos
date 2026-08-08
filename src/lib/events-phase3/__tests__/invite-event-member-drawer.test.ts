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
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const overview = readSrc(
    "../../../components/events-phase3/EventWorkspaceOverviewPanel.tsx",
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
    assert.match(actions, /already on your team/i);
    assert.match(actions, /replaceOrganizationUserEventAssignments/);
    assert.match(actions, /mergeEventAssignmentIds/);
    assert.match(actions, /requirePermission\("manage_people"\)/);
    assert.match(actions, /status === "active"/);
  });

  it("wires Event ID entry points without preloading the org directory", () => {
    assert.match(client, /InviteEventMemberDrawer/);
    assert.match(client, /onInviteTeamMember/);
    assert.match(client, /canManageAssignments \? \(\) => setInviteOpen\(true\)/);
    assert.match(client, /inviteCollaborators/);
    assert.match(client, /handleMemberAdded/);
    assert.match(client, /event\.date/);
    assert.match(client, /artwork\?\.imageUrl/);
    assert.doesNotMatch(client, /loadInviteEventMemberRolesAction/);
    assert.match(shell, /data-testid="event-invite-team-member"/);
    assert.match(shell, /Invite Team/);
    assert.match(overview, /CommunityWorkspaceCard/);
    assert.match(overview, /data-testid="event-invite-team-member-community"/);
    assert.match(overview, /<\/span> Invite/);
    assert.match(overview, /Invite pending/);
    assert.match(teamPanel, /\+ Invite team member/);
    assert.match(teamPanel, /onInviteTeamMember/);
    assert.match(teamPanel, /inviteCollaborators/);
    assert.match(teamPanel, /Invite pending/);
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

  it("passes current event context into the reusable drawer only", () => {
    assert.match(client, /id: event\.id/);
    assert.match(client, /title: event\.title/);
    assert.match(client, /date: event\.date/);
    assert.doesNotMatch(client, /TeamAccessInviteModal/);
  });
});
