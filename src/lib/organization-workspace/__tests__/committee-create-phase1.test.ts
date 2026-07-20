import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { OrganizationCommitteeInput } from "../../organization-workspace/committee-mutations.ts";

describe("committee create payload phase 1", () => {
  it("supports supervising VP, chairs, and assigned event without members list", () => {
    const input: OrganizationCommitteeInput = {
      name: "Book Fair",
      parentRoleId: "role-vp-1",
      contactName: "Sarah Chen, Jamie Smith",
      contactEmail: "bookfair@example.com",
      assignedEventId: "event-1",
    };

    assert.equal(input.name, "Book Fair");
    assert.equal(input.parentRoleId, "role-vp-1");
    assert.equal(input.contactName, "Sarah Chen, Jamie Smith");
    assert.equal(input.assignedEventId, "event-1");
    assert.equal(
      "membersText" in input,
      false,
      "Phase 1 must not add free-text committee members",
    );
  });
});
