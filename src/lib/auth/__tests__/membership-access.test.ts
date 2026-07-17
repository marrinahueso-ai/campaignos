import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCOUNT_DEACTIVATED_LOGIN_PATH,
  resolveOrganizationAccessState,
  selfMembershipChangeError,
} from "../membership-access.ts";

describe("membership access state", () => {
  it("prefers active over deactivated", () => {
    assert.equal(
      resolveOrganizationAccessState(["deactivated", "active"]),
      "active",
    );
  });

  it("detects deactivated when no active membership remains", () => {
    assert.equal(
      resolveOrganizationAccessState(["deactivated", "invited"]),
      "deactivated",
    );
  });

  it("returns none when user has no membership rows", () => {
    assert.equal(resolveOrganizationAccessState([]), "none");
    assert.equal(resolveOrganizationAccessState(["invited"]), "none");
  });
});

describe("self membership change guard", () => {
  const actorUserId = "user-admin-1";

  it("blocks self-deactivate", () => {
    const error = selfMembershipChangeError({
      actorUserId,
      targetUserId: actorUserId,
      change: "deactivate",
    });
    assert.match(error ?? "", /cannot deactivate your own account/i);
  });

  it("blocks self-remove", () => {
    const error = selfMembershipChangeError({
      actorUserId,
      targetUserId: actorUserId,
      change: "remove",
    });
    assert.match(error ?? "", /cannot remove your own account/i);
  });

  it("allows deactivate/remove for other members", () => {
    assert.equal(
      selfMembershipChangeError({
        actorUserId,
        targetUserId: "user-other",
        change: "deactivate",
      }),
      null,
    );
    assert.equal(
      selfMembershipChangeError({
        actorUserId,
        targetUserId: "user-other",
        change: "remove",
      }),
      null,
    );
  });

  it("allows when target has no linked auth user yet", () => {
    assert.equal(
      selfMembershipChangeError({
        actorUserId,
        targetUserId: null,
        change: "deactivate",
      }),
      null,
    );
  });
});

describe("deactivated login path", () => {
  it("uses a dedicated login error, not school setup", () => {
    assert.equal(
      ACCOUNT_DEACTIVATED_LOGIN_PATH,
      "/login?error=account_deactivated",
    );
    assert.doesNotMatch(ACCOUNT_DEACTIVATED_LOGIN_PATH, /school-setup/);
    assert.doesNotMatch(ACCOUNT_DEACTIVATED_LOGIN_PATH, /intent=setup/);
  });
});
