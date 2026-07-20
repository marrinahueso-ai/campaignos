import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appAccessLabel,
  committeeAssignmentRoleLabel,
  packCommitteeContactName,
  resolveInviteLinkDecision,
  resolvePackedRoleFromIndex,
  ROSTER_ONLY_STATUS_LABEL,
} from "../roster-first.ts";

describe("roster-first dual-write packing", () => {
  it("packs chair, co-chair, and members in order", () => {
    const packed = packCommitteeContactName([
      { role: "member", memberName: "Alex Member" },
      { role: "chair", memberName: "Jamie Chair" },
      { role: "co_chair", memberName: "Sam Co" },
      { role: "supervising_vp", memberName: "VP Person" },
    ]);

    assert.equal(packed, "Jamie Chair, Sam Co, Alex Member");
  });

  it("returns null when only supervising_vp is present", () => {
    assert.equal(
      packCommitteeContactName([
        { role: "supervising_vp", memberName: "VP Only" },
      ]),
      null,
    );
  });

  it("maps packed indexes to chair / co-chair / member", () => {
    assert.equal(resolvePackedRoleFromIndex(0), "chair");
    assert.equal(resolvePackedRoleFromIndex(1), "co_chair");
    assert.equal(resolvePackedRoleFromIndex(2), "member");
  });
});

describe("roster role and app access labels", () => {
  it("builds committee-specific roster role labels", () => {
    assert.equal(
      committeeAssignmentRoleLabel("chair", "Book Fair"),
      "Book Fair Chair",
    );
    assert.equal(
      committeeAssignmentRoleLabel("co_chair", "Book Fair"),
      "Book Fair Co-Chair",
    );
    assert.equal(
      committeeAssignmentRoleLabel("member", "Book Fair"),
      "Book Fair Member",
    );
  });

  it("keeps app access visually separate from roster role", () => {
    assert.equal(appAccessLabel(false, null), "No app access");
    assert.equal(appAccessLabel(true, "contributor"), "Contributor");
    assert.equal(appAccessLabel(true, "tester"), "Tester");
    assert.equal(appAccessLabel(true, "developer"), "Developer");
    assert.equal(appAccessLabel(true, "admin"), "Admin");
    assert.equal(ROSTER_ONLY_STATUS_LABEL, "Roster only — no app access");
  });
});

describe("invite linking duplicate prevention", () => {
  it("inserts when no organization_users row exists", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: null,
      rosterMemberId: "member-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.deepEqual(decision, { action: "insert" });
  });

  it("updates existing invited row and links roster person", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: {
        id: "user-1",
        status: "invited",
        organizationMemberId: null,
      },
      rosterMemberId: "member-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.deepEqual(decision, {
      action: "update",
      organizationUserId: "user-1",
    });
  });

  it("rejects when roster person is already linked elsewhere", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: null,
      rosterMemberId: "member-1",
      alreadyLinkedToOtherMember: true,
    });
    assert.equal(decision.action, "error");
  });

  it("rejects email already linked to a different roster person", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: {
        id: "user-1",
        status: "invited",
        organizationMemberId: "member-other",
      },
      rosterMemberId: "member-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.equal(decision.action, "error");
  });

  it("rejects active member that already has app access for this roster person", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: {
        id: "user-1",
        status: "active",
        organizationMemberId: "member-1",
      },
      rosterMemberId: "member-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.equal(decision.action, "error");
  });
});
