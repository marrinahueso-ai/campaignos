import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLockedContactStatus,
  resolveContactReimportAction,
} from "@/lib/newsletter/contact-reimport";
import type { NewsletterContactStatus } from "@/lib/newsletter/types";

describe("isLockedContactStatus", () => {
  it("locks unsubscribed/suppressed/bounced/complained", () => {
    (["unsubscribed", "suppressed", "bounced", "complained"] as NewsletterContactStatus[]).forEach(
      (status) => {
        assert.equal(isLockedContactStatus(status), true);
      },
    );
  });

  it("does not lock active", () => {
    assert.equal(isLockedContactStatus("active"), false);
  });
});

describe("resolveContactReimportAction", () => {
  it("creates a new contact when none exists", () => {
    const action = resolveContactReimportAction(null, { firstName: "Sam", lastName: "Lee" });
    assert.deepEqual(action, { kind: "create" });
  });

  it("never reactivates a locked contact, even on re-import", () => {
    for (const status of ["unsubscribed", "suppressed", "bounced", "complained"] as const) {
      const action = resolveContactReimportAction(
        { status, firstName: "Old", lastName: "Name" },
        { firstName: "New", lastName: "Name" },
      );
      assert.equal(action.kind, "keep_locked");
      if (action.kind === "keep_locked") {
        assert.equal(action.status, status);
        // Name may still refresh even though status is preserved.
        assert.equal(action.firstName, "New");
      }
    }
  });

  it("updates name fields for an active contact when they differ", () => {
    const action = resolveContactReimportAction(
      { status: "active", firstName: "Sam", lastName: "Lee" },
      { firstName: "Samantha", lastName: "Lee" },
    );
    assert.deepEqual(action, { kind: "update_active", firstName: "Samantha", lastName: "Lee" });
  });

  it("is a no-op for an active contact with unchanged names", () => {
    const action = resolveContactReimportAction(
      { status: "active", firstName: "Sam", lastName: "Lee" },
      { firstName: "Sam", lastName: "Lee" },
    );
    assert.deepEqual(action, { kind: "noop" });
  });

  it("falls back to existing names when incoming names are blank", () => {
    const action = resolveContactReimportAction(
      { status: "active", firstName: "Sam", lastName: "Lee" },
      { firstName: "  ", lastName: undefined },
    );
    assert.deepEqual(action, { kind: "noop" });
  });
});
