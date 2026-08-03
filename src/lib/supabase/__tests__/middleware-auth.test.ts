import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimsToMiddlewareUser,
  isAuthRateLimitError,
} from "../middleware-auth.ts";

describe("claimsToMiddlewareUser", () => {
  it("maps sub / email / app_metadata from JWT claims", () => {
    assert.deepEqual(
      claimsToMiddlewareUser({
        sub: "user-1",
        email: "a@example.com",
        app_metadata: { must_change_password: true },
      }),
      {
        id: "user-1",
        email: "a@example.com",
        app_metadata: { must_change_password: true },
      },
    );
  });

  it("returns null without a sub", () => {
    assert.equal(claimsToMiddlewareUser({ email: "a@example.com" }), null);
    assert.equal(claimsToMiddlewareUser(null), null);
    assert.equal(claimsToMiddlewareUser(undefined), null);
  });

  it("ignores non-object app_metadata", () => {
    assert.deepEqual(
      claimsToMiddlewareUser({ sub: "user-1", app_metadata: "nope" }),
      { id: "user-1", email: undefined, app_metadata: undefined },
    );
  });
});

describe("isAuthRateLimitError", () => {
  it("detects 429 / over_request_rate_limit / message", () => {
    assert.equal(isAuthRateLimitError({ status: 429, message: "x" }), true);
    assert.equal(
      isAuthRateLimitError({ code: "over_request_rate_limit", message: "x" }),
      true,
    );
    assert.equal(
      isAuthRateLimitError({ message: "Request rate limit reached" }),
      true,
    );
    assert.equal(
      isAuthRateLimitError({ status: 401, message: "invalid" }),
      false,
    );
    assert.equal(isAuthRateLimitError(null), false);
  });
});
