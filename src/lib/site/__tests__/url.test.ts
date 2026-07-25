import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SITE_URL,
  resolveSiteOrigin,
  resolveSiteUrlFromHeaders,
} from "@/lib/site/url";

describe("resolveSiteOrigin host-header injection guard", () => {
  it("reflects localhost origins unchanged", () => {
    assert.equal(
      resolveSiteOrigin("http://localhost:3000"),
      "http://localhost:3000",
    );
  });

  it("resolves legacy vercel host to the canonical site", () => {
    assert.equal(
      resolveSiteOrigin("https://campaignos-six.vercel.app"),
      DEFAULT_SITE_URL,
    );
  });

  it("resolves *.vercel.app preview origins to the canonical site", () => {
    assert.equal(
      resolveSiteOrigin("https://my-branch-123.vercel.app"),
      DEFAULT_SITE_URL,
    );
  });

  it("never reflects an arbitrary attacker-controlled origin", () => {
    assert.equal(resolveSiteOrigin("https://evil.example.com"), DEFAULT_SITE_URL);
    assert.equal(
      resolveSiteOrigin("https://heyralli.com.evil.example.com"),
      DEFAULT_SITE_URL,
    );
  });

  it("falls back to the default site when no origin is given", () => {
    assert.equal(resolveSiteOrigin(null), DEFAULT_SITE_URL);
    assert.equal(resolveSiteOrigin(undefined), DEFAULT_SITE_URL);
  });
});

describe("resolveSiteUrlFromHeaders host-header injection guard", () => {
  it("reflects a localhost host header", () => {
    assert.equal(
      resolveSiteUrlFromHeaders("localhost:3000", "http"),
      "http://localhost:3000",
    );
  });

  it("resolves a spoofed x-forwarded-host to the default site, not the header", () => {
    assert.equal(
      resolveSiteUrlFromHeaders("evil.example.com", "https"),
      DEFAULT_SITE_URL,
    );
  });

  it("resolves a *.vercel.app forwarded host to the canonical site", () => {
    assert.equal(
      resolveSiteUrlFromHeaders("my-branch-123.vercel.app", "https"),
      DEFAULT_SITE_URL,
    );
  });

  it("falls back to the default site when no host header is present", () => {
    assert.equal(resolveSiteUrlFromHeaders(null), DEFAULT_SITE_URL);
  });
});
