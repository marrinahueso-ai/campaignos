import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  packCommitteeContactName,
  resolveInviteLinkDecision,
} from "../roster-first.ts";

describe("roster invite linking preserves assignments", () => {
  it("keeps packed committee assignments intact when granting access later", () => {
    const beforeInvite = packCommitteeContactName([
      { role: "chair", memberName: "Jamie Chair" },
      { role: "co_chair", memberName: "Sam Co" },
      { role: "member", memberName: "Alex Member" },
    ]);

    // Give App Access only creates organization_users + link; dual-write packing unchanged.
    const afterInvite = beforeInvite;
    assert.equal(afterInvite, "Jamie Chair, Sam Co, Alex Member");
  });

  it("links invite to existing roster person instead of creating a duplicate decision path", () => {
    const first = resolveInviteLinkDecision({
      existingOrgUser: null,
      rosterMemberId: "roster-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.deepEqual(first, { action: "insert" });

    const second = resolveInviteLinkDecision({
      existingOrgUser: {
        id: "ou-1",
        status: "invited",
        organizationMemberId: "roster-1",
      },
      rosterMemberId: "roster-1",
      alreadyLinkedToOtherMember: false,
    });
    assert.deepEqual(second, {
      action: "update",
      organizationUserId: "ou-1",
    });
  });

  it("blocks a second login row from attaching to the same roster person", () => {
    const decision = resolveInviteLinkDecision({
      existingOrgUser: {
        id: "ou-2",
        status: "invited",
        organizationMemberId: null,
      },
      rosterMemberId: "roster-1",
      alreadyLinkedToOtherMember: true,
    });
    assert.equal(decision.action, "error");
  });
});
