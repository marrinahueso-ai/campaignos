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

describe("team invite email", () => {
  it("includes invite link and optional message", () => {
    const content = buildTeamInviteEmail({
      organizationName: "EES PTO",
      inviteeName: "Jamie",
      inviteeEmail: "jamie@example.com",
      accessLevelLabel: "Tester",
      inviteUrl: "https://heyralli.com/login?invite=abc",
      personalMessage: "Welcome aboard",
      inviterEmail: "admin@example.com",
    });

    assert.match(content.subject, /EES PTO/);
    assert.match(content.text, /Welcome aboard/);
    assert.match(content.text, /https:\/\/heyralli.com\/login\?invite=abc/);
    assert.match(content.html, /Accept invite/);
  });
});
