import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApprovalAssigneeLabel } from "../assignee-display-name.ts";

describe("resolveApprovalAssigneeLabel", () => {
  it("prefers edit-profile display name over email", () => {
    assert.equal(
      resolveApprovalAssigneeLabel({
        userDisplayName: "Marrina Hueso",
        userEmail: "marrina@huesoinvestments.com",
        roleContactName: "Rebecca Kidd",
      }),
      "Marrina Hueso",
    );
  });

  it("uses role contact name when no user display name", () => {
    assert.equal(
      resolveApprovalAssigneeLabel({
        userDisplayName: null,
        userEmail: null,
        roleContactName: "Rebecca Kidd",
        roleName: "President",
      }),
      "Rebecca Kidd",
    );
  });

  it("falls back to email only when display name is missing", () => {
    assert.equal(
      resolveApprovalAssigneeLabel({
        userDisplayName: "  ",
        userEmail: "marrina@huesoinvestments.com",
      }),
      "marrina@huesoinvestments.com",
    );
  });
});
