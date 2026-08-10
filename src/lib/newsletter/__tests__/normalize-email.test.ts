import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidEmailFormat, normalizeEmail } from "@/lib/newsletter/normalize-email";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    assert.equal(normalizeEmail("  Parent@Example.COM  "), "parent@example.com");
  });

  it("is idempotent", () => {
    const once = normalizeEmail("Parent@Example.COM");
    assert.equal(normalizeEmail(once), once);
  });
});

describe("isValidEmailFormat", () => {
  it("accepts well-formed addresses", () => {
    assert.equal(isValidEmailFormat("parent@example.com"), true);
    assert.equal(isValidEmailFormat("  parent+tag@example.co.uk  "), true);
  });

  it("rejects malformed addresses", () => {
    assert.equal(isValidEmailFormat("not-an-email"), false);
    assert.equal(isValidEmailFormat("missing-domain@"), false);
    assert.equal(isValidEmailFormat("@missing-local.com"), false);
    assert.equal(isValidEmailFormat("has space@example.com"), false);
    assert.equal(isValidEmailFormat(""), false);
  });
});
