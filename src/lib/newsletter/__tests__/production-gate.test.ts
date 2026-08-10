import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  assertNewsletterProductionSendEnabled,
  isNewsletterProductionSendEnabled,
} from "@/lib/newsletter/production-gate";

const ENV_KEY = "NEWSLETTER_PRODUCTION_SEND_ENABLED";
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = original;
  }
});

describe("isNewsletterProductionSendEnabled", () => {
  it("defaults to disabled (fail closed) when unset", () => {
    delete process.env[ENV_KEY];
    assert.equal(isNewsletterProductionSendEnabled(), false);
  });

  it("stays disabled for any value other than the exact string 'true'", () => {
    for (const value of ["TRUE", "1", "yes", "True "]) {
      process.env[ENV_KEY] = value;
      assert.equal(isNewsletterProductionSendEnabled(), false);
    }
  });

  it("is enabled only when explicitly set to 'true'", () => {
    process.env[ENV_KEY] = "true";
    assert.equal(isNewsletterProductionSendEnabled(), true);
  });
});

describe("assertNewsletterProductionSendEnabled", () => {
  it("returns an error message when disabled", () => {
    delete process.env[ENV_KEY];
    assert.equal(typeof assertNewsletterProductionSendEnabled(), "string");
  });

  it("returns null when enabled", () => {
    process.env[ENV_KEY] = "true";
    assert.equal(assertNewsletterProductionSendEnabled(), null);
  });
});
