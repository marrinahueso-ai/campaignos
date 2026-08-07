import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertSafeOutboundUrl,
  isBlockedIpAddress,
} from "@/lib/security/safe-outbound-url";

describe("isBlockedIpAddress", () => {
  it("blocks loopback, RFC1918, link-local, and CGNAT", () => {
    assert.equal(isBlockedIpAddress("127.0.0.1"), true);
    assert.equal(isBlockedIpAddress("10.0.0.5"), true);
    assert.equal(isBlockedIpAddress("192.168.1.1"), true);
    assert.equal(isBlockedIpAddress("172.16.0.1"), true);
    assert.equal(isBlockedIpAddress("169.254.169.254"), true);
    assert.equal(isBlockedIpAddress("100.64.1.1"), true);
    assert.equal(isBlockedIpAddress("::1"), true);
  });

  it("allows public addresses", () => {
    assert.equal(isBlockedIpAddress("8.8.8.8"), false);
    assert.equal(isBlockedIpAddress("1.1.1.1"), false);
  });
});

describe("assertSafeOutboundUrl", () => {
  it("rejects credentials, localhost, and literal private IPs", () => {
    assert.equal(
      assertSafeOutboundUrl("https://user:pass@example.com/x").ok,
      false,
    );
    assert.equal(assertSafeOutboundUrl("https://localhost/x").ok, false);
    assert.equal(
      assertSafeOutboundUrl("http://169.254.169.254/latest/meta-data/", {
        allowHttp: true,
      }).ok,
      false,
    );
  });

  it("requires https unless allowHttp is set", () => {
    assert.equal(assertSafeOutboundUrl("http://example.com/feed.ics").ok, false);
    assert.equal(
      assertSafeOutboundUrl("http://example.com/feed.ics", { allowHttp: true }).ok,
      true,
    );
  });

  it("enforces host allowlists", () => {
    const denied = assertSafeOutboundUrl("https://evil.example/a.png", {
      allowedHostPatterns: ["*.supabase.co"],
    });
    assert.equal(denied.ok, false);

    const allowed = assertSafeOutboundUrl(
      "https://abc.supabase.co/storage/v1/object/public/x.png",
      { allowedHostPatterns: ["*.supabase.co"] },
    );
    assert.equal(allowed.ok, true);
  });
});
