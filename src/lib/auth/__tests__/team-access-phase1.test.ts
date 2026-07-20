import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CAMPAIGN_ROLES,
  canApproveDraft,
  canPublishCampaignContent,
  canSubmitForApproval,
  campaignRoleLabel,
  isCampaignRole,
} from "../campaign-roles.ts";
import { canManageTeam } from "../infer-campaign-role.ts";
import { buildTeamInviteEmail } from "../../email/team-invite-email.ts";
import {
  computeInviteExpiresAt,
  isInviteExpired,
  TEAM_INVITE_TTL_DAYS,
} from "../invite-constants.ts";

describe("campaign roles phase 1", () => {
  it("includes developer and tester", () => {
    assert.equal(isCampaignRole("developer"), true);
    assert.equal(isCampaignRole("tester"), true);
    assert.ok(CAMPAIGN_ROLES.includes("developer"));
    assert.ok(CAMPAIGN_ROLES.includes("tester"));
    assert.equal(campaignRoleLabel("developer"), "Developer");
    assert.equal(campaignRoleLabel("tester"), "Tester");
  });

  it("keeps team management to admin and president only", () => {
    assert.equal(canManageTeam("admin"), true);
    assert.equal(canManageTeam("president"), true);
    assert.equal(canManageTeam("developer"), false);
    assert.equal(canManageTeam("tester"), false);
    assert.equal(canManageTeam("contributor"), false);
  });

  it("gives developer approval access and blocks tester approval/publishing", () => {
    assert.equal(canApproveDraft("developer"), true);
    assert.equal(canApproveDraft("tester"), false);
    assert.equal(canSubmitForApproval("tester"), true);
    assert.equal(canPublishCampaignContent("developer"), true);
    assert.equal(canPublishCampaignContent("tester"), false);
    assert.equal(canPublishCampaignContent("contributor"), true);
  });
});

describe("invite expiry helpers", () => {
  it("computes expiry TEAM_INVITE_TTL_DAYS ahead", () => {
    const from = new Date("2026-07-17T12:00:00.000Z");
    const expires = computeInviteExpiresAt(from);
    const expected = new Date(from);
    expected.setUTCDate(expected.getUTCDate() + TEAM_INVITE_TTL_DAYS);
    assert.equal(expires, expected.toISOString());
    assert.equal(isInviteExpired(expires), false);
    assert.equal(isInviteExpired("2000-01-01T00:00:00.000Z"), true);
  });
});

describe("team invite email", () => {
  it("includes invite setup link without emailed password", () => {
    const content = buildTeamInviteEmail({
      organizationName: "EES PTO",
      inviteeName: "Jamie",
      inviteeEmail: "jamie@example.com",
      accessLevelLabel: "Developer",
      inviteUrl: "https://heyralli.com/invite/abc",
      personalMessage: "Welcome aboard",
      inviterEmail: "admin@example.com",
    });

    assert.match(content.subject, /EES PTO/);
    assert.match(content.text, /Welcome aboard/);
    assert.match(content.text, /Developer/);
    assert.match(content.text, /jamie@example.com/);
    assert.match(content.text, /https:\/\/heyralli.com\/invite\/abc/);
    assert.match(content.text, /Create your own password/);
    assert.match(content.html, /Accept invite/);
    assert.match(content.html, /create password/i);
    assert.match(content.html, /Hey Ralli/);
    assert.match(content.html, /Team invite/);
    assert.doesNotMatch(content.html, /Temporary password/);
    assert.doesNotMatch(content.text, /Temporary password:/);
  });
});
