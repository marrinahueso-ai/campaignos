import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { validateFoundingAccessCode } from "@/lib/auth/founding-access";

describe("validateFoundingAccessCode", () => {
  const originalCodes = process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES;
  const originalSingle = process.env.CAMPAIGNOS_BETA_ACCESS_CODE;

  beforeEach(() => {
    process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES = "FOUNDER2026,BETA-CODE";
    delete process.env.CAMPAIGNOS_BETA_ACCESS_CODE;
  });

  afterEach(() => {
    if (originalCodes === undefined) {
      delete process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES;
    } else {
      process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES = originalCodes;
    }
    if (originalSingle === undefined) {
      delete process.env.CAMPAIGNOS_BETA_ACCESS_CODE;
    } else {
      process.env.CAMPAIGNOS_BETA_ACCESS_CODE = originalSingle;
    }
  });

  it("accepts a configured code regardless of case", () => {
    assert.equal(validateFoundingAccessCode("founder2026"), true);
    assert.equal(validateFoundingAccessCode("FOUNDER2026"), true);
    assert.equal(validateFoundingAccessCode("beta-code"), true);
  });

  it("rejects an unconfigured code", () => {
    assert.equal(validateFoundingAccessCode("NOT-A-CODE"), false);
  });

  it("rejects codes of different lengths without throwing", () => {
    assert.equal(validateFoundingAccessCode("F"), false);
    assert.equal(validateFoundingAccessCode("FOUNDER2026-BUT-LONGER"), false);
  });

  it("rejects null/undefined/empty input", () => {
    assert.equal(validateFoundingAccessCode(null), false);
    assert.equal(validateFoundingAccessCode(undefined), false);
    assert.equal(validateFoundingAccessCode(""), false);
    assert.equal(validateFoundingAccessCode("   "), false);
  });

  it("returns false when no codes are configured at all", () => {
    delete process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES;
    delete process.env.CAMPAIGNOS_BETA_ACCESS_CODE;
    assert.equal(validateFoundingAccessCode("ANYTHING"), false);
  });
});
