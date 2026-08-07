import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCronRequestAuthorized } from "@/lib/security/cron-auth";

describe("isCronRequestAuthorized", () => {
  const original = {
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  function restoreEnv() {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  it("requires bearer secret when configured", () => {
    process.env.CRON_SECRET = "test-secret";
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "production";

    const ok = new Request("https://heyralli.com/api/cron/x", {
      headers: { authorization: "Bearer test-secret" },
    });
    const bad = new Request("https://heyralli.com/api/cron/x");
    assert.equal(isCronRequestAuthorized(ok), true);
    assert.equal(isCronRequestAuthorized(bad), false);
    restoreEnv();
  });

  it("fails closed on Vercel preview/production without secret", () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    const req = new Request("https://example.vercel.app/api/cron/x");
    assert.equal(isCronRequestAuthorized(req), false);

    process.env.VERCEL_ENV = "production";
    assert.equal(isCronRequestAuthorized(req), false);
    restoreEnv();
  });

  it("allows local development without secret", () => {
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/cron/x");
    assert.equal(isCronRequestAuthorized(req), true);
    restoreEnv();
  });
});
