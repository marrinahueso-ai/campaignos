import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it, beforeEach, afterEach } from "node:test";
import { encryptOAuthToken, decryptOAuthToken } from "@/lib/security/token-encryption";

describe("token-encryption", () => {
  const originalKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.OAUTH_TOKEN_ENCRYPTION_KEY = originalKey;
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
    process.env.NODE_ENV = originalNodeEnv;
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

  it("falls back to storing plaintext when no key is configured (local only)", () => {
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "development";
    const plaintext = "some-token";
    assert.equal(encryptOAuthToken(plaintext), plaintext);
  });

  it("rejects plaintext storage in production when no key is configured", () => {
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    assert.throws(
      () => encryptOAuthToken("some-token"),
      /OAUTH_TOKEN_ENCRYPTION_KEY is required/,
    );
  });

  it("rejects a key that isn't exactly 32 bytes", () => {
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "development";
    const plaintext = "some-token";
    assert.equal(encryptOAuthToken(plaintext), plaintext);
  });
});
