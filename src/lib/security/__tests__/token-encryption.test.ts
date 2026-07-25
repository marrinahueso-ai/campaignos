import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it, beforeEach, afterEach } from "node:test";
import { encryptOAuthToken, decryptOAuthToken } from "@/lib/security/token-encryption";

describe("token-encryption", () => {
  const originalKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.OAUTH_TOKEN_ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips a token through encrypt/decrypt", () => {
    const plaintext = "EAAG_super_secret_meta_page_token_abc123";
    const encrypted = encryptOAuthToken(plaintext);
    assert.notEqual(encrypted, plaintext);
    assert.match(encrypted, /^encv1:/);
    assert.equal(decryptOAuthToken(encrypted), plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const plaintext = "same-token-value";
    const a = encryptOAuthToken(plaintext);
    const b = encryptOAuthToken(plaintext);
    assert.notEqual(a, b);
    assert.equal(decryptOAuthToken(a), plaintext);
    assert.equal(decryptOAuthToken(b), plaintext);
  });

  it("returns legacy plaintext (no prefix) unchanged on decrypt", () => {
    assert.equal(decryptOAuthToken("plain-legacy-token"), "plain-legacy-token");
  });

  it("returns empty string for null/undefined/empty input", () => {
    assert.equal(decryptOAuthToken(null), "");
    assert.equal(decryptOAuthToken(undefined), "");
    assert.equal(decryptOAuthToken(""), "");
  });

  it("returns empty string (not a throw) for corrupted ciphertext", () => {
    assert.equal(decryptOAuthToken("encv1:not:valid:base64!!"), "");
  });

  it("falls back to storing plaintext when no key is configured", () => {
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    const plaintext = "some-token";
    assert.equal(encryptOAuthToken(plaintext), plaintext);
  });

  it("rejects a key that isn't exactly 32 bytes", () => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    const plaintext = "some-token";
    assert.equal(encryptOAuthToken(plaintext), plaintext);
  });
});
