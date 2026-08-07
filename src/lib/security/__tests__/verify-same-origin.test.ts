import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSameOriginRequest } from "@/lib/security/verify-same-origin";

function requestWith(url: string, origin: string | null): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(url, { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("allows a request with no Origin header (non-browser / same-site nav)", () => {
    assert.equal(
      isSameOriginRequest(requestWith("https://heyralli.com/api/insights/sync", null)),
      true,
    );
  });

  it("allows a matching same-origin request", () => {
    assert.equal(
      isSameOriginRequest(
        requestWith("https://heyralli.com/api/insights/sync", "https://heyralli.com"),
      ),
      true,
    );
  });

  it("rejects a cross-site Origin", () => {
    assert.equal(
      isSameOriginRequest(
        requestWith("https://heyralli.com/api/insights/sync", "https://evil.example"),
      ),
      false,
    );
  });

  it("rejects Sec-Fetch-Site cross-site even without Origin", () => {
    const headers = new Headers({ "sec-fetch-site": "cross-site" });
    const request = new Request("https://heyralli.com/api/insights/sync", {
      method: "POST",
      headers,
    });
    assert.equal(isSameOriginRequest(request), false);
  });
});
