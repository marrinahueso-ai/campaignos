import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCOUNT_ERASE_CONFIRMATION,
  accountEraseRequiresPassword,
  isValidAccountEraseConfirmation,
  lastWorkspaceAdminEraseError,
} from "../erase-account.ts";

describe("account erase confirmation", () => {
  it("accepts exact DELETE", () => {
    assert.equal(isValidAccountEraseConfirmation(ACCOUNT_ERASE_CONFIRMATION), true);
    assert.equal(isValidAccountEraseConfirmation(" DELETE "), true);
  });

  it("rejects other phrases", () => {
    assert.equal(isValidAccountEraseConfirmation("delete"), false);
    assert.equal(isValidAccountEraseConfirmation("ERASE"), false);
    assert.equal(isValidAccountEraseConfirmation(""), false);
  });
});

describe("accountEraseRequiresPassword", () => {
  it("requires password for email identity or empty identities", () => {
    assert.equal(accountEraseRequiresPassword([{ provider: "email" }]), true);
    assert.equal(accountEraseRequiresPassword([]), true);
    assert.equal(accountEraseRequiresPassword(null), true);
  });

  it("skips password for OAuth-only identities", () => {
    assert.equal(accountEraseRequiresPassword([{ provider: "google" }]), false);
    assert.equal(
      accountEraseRequiresPassword([
        { provider: "google" },
        { provider: "facebook" },
      ]),
      false,
    );
  });
});

describe("lastWorkspaceAdminEraseError", () => {
  it("blocks when sole active admin on a workspace", () => {
    const error = lastWorkspaceAdminEraseError(
      [
        {
          organizationId: "org-a",
          campaignRole: "admin",
          status: "active",
        },
      ],
      { "org-a": 0 },
    );
    assert.match(error ?? "", /last admin/i);
  });

  it("allows when another admin/president remains", () => {
    assert.equal(
      lastWorkspaceAdminEraseError(
        [
          {
            organizationId: "org-a",
            campaignRole: "president",
            status: "active",
          },
        ],
        { "org-a": 1 },
      ),
      null,
    );
  });

  it("allows non-manage roles even if alone", () => {
    assert.equal(
      lastWorkspaceAdminEraseError(
        [
          {
            organizationId: "org-a",
            campaignRole: "contributor",
            status: "active",
          },
        ],
        { "org-a": 0 },
      ),
      null,
    );
  });
});
