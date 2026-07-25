import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rateLimitMessage } from "@/lib/security/rate-limit-message";

describe("rateLimitMessage", () => {
  it("rounds up to a minute for short waits", () => {
    assert.equal(
      rateLimitMessage(10, "sign-in attempts"),
      "Too many sign-in attempts. Please wait a minute and try again.",
    );
  });

  it("pluralizes minutes for longer waits", () => {
    assert.equal(
      rateLimitMessage(125, "attempts"),
      "Too many attempts. Please wait 3 minutes and try again.",
    );
  });

  it("defaults the subject to attempts", () => {
    assert.equal(
      rateLimitMessage(30),
      "Too many attempts. Please wait a minute and try again.",
    );
  });
});
