import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFoundingSetupEmailUrl } from "../founding-setup-link.ts";

describe("buildFoundingSetupEmailUrl", () => {
  it("builds app callback URL with token_hash from generateLink fields", () => {
    const url = buildFoundingSetupEmailUrl({
      emailRedirectTo:
        "https://heyralli.com/auth/callback?setup=1&next=%2Fsettings%2Fschool-setup",
      actionLink:
        "https://zyllfqieeihshnwpakiv.supabase.co/auth/v1/verify?token=abc123&type=signup&redirect_to=https%3A%2F%2Fheyralli.com%2Fauth%2Fcallback",
      hashedToken: "abc123",
      verificationType: "signup",
    });

    assert.ok(url);
    const parsed = new URL(url!);
    assert.equal(parsed.origin, "https://heyralli.com");
    assert.equal(parsed.pathname, "/auth/callback");
    assert.equal(parsed.searchParams.get("setup"), "1");
    assert.equal(parsed.searchParams.get("token_hash"), "abc123");
    assert.equal(parsed.searchParams.get("type"), "signup");
    assert.equal(parsed.searchParams.get("next"), "/settings/school-setup");
  });

  it("falls back to action_link query params when hashed token omitted", () => {
    const url = buildFoundingSetupEmailUrl({
      emailRedirectTo: "https://heyralli.com/auth/callback?setup=1",
      actionLink:
        "https://example.supabase.co/auth/v1/verify?token=tok_from_link&type=magiclink&redirect_to=https%3A%2F%2Fheyralli.com",
    });

    assert.ok(url);
    const parsed = new URL(url!);
    assert.equal(parsed.searchParams.get("token_hash"), "tok_from_link");
    assert.equal(parsed.searchParams.get("type"), "magiclink");
  });
});
