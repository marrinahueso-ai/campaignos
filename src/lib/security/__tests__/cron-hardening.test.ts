import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isSentryTestAuthorized } from "@/lib/monitoring/sentry-verify";

const CRON_ROOT = fileURLToPath(new URL("../../../app/api/cron", import.meta.url));

function listCronRouteDirs(): string[] {
  return readdirSync(CRON_ROOT, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(CRON_ROOT, entry.name, "route.ts")),
    )
    .map((entry) => entry.name)
    .sort();
}

function readCronRouteSrc(dir: string): string {
  return readFileSync(join(CRON_ROOT, dir, "route.ts"), "utf8");
}

/**
 * Operational-hardening regression guard:
 * 1. Every /api/cron/* route declares an explicit maxDuration so an org-wide
 *    sweep can't be silently truncated by the platform default as org count
 *    grows — a truncated run would look identical to a healthy one in the
 *    cron's own success response.
 * 2. The Sentry verification routes never fall back to CRON_SECRET (see
 *    sentry-verify.ts for the exposure this prevents) and the API route
 *    never accepts the secret via a URL query string.
 */
describe("cron routes declare an explicit maxDuration", () => {
  const cronRouteDirs = listCronRouteDirs();

  it("discovers at least one /api/cron/*/route.ts", () => {
    assert.ok(
      cronRouteDirs.length > 0,
      "expected to find cron route.ts files under src/app/api/cron",
    );
  });

  for (const dir of cronRouteDirs) {
    it(`/api/cron/${dir} sets maxDuration`, () => {
      const src = readCronRouteSrc(dir);
      assert.match(
        src,
        /export const maxDuration = \d+;/,
        `${dir}/route.ts must export maxDuration`,
      );
    });
  }
});

describe("Sentry verify secret isolation from CRON_SECRET", () => {
  const ORIGINAL_ENV = { ...process.env };

  function withEnv(env: Record<string, string | undefined>, fn: () => void) {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    try {
      fn();
    } finally {
      process.env = { ...ORIGINAL_ENV };
    }
  }

  it("does not authorize using CRON_SECRET when SENTRY_VERIFY_SECRET is unset", () => {
    withEnv(
      { SENTRY_VERIFY_SECRET: undefined, CRON_SECRET: "the-real-cron-secret" },
      () => {
        const request = new Request("https://example.com/api/sentry-verify", {
          headers: { authorization: "Bearer the-real-cron-secret" },
        });
        assert.equal(isSentryTestAuthorized(request), false);
      },
    );
  });

  it("authorizes with a matching SENTRY_VERIFY_SECRET header", () => {
    withEnv(
      { SENTRY_VERIFY_SECRET: "dedicated-secret", CRON_SECRET: "the-real-cron-secret" },
      () => {
        const request = new Request("https://example.com/api/sentry-verify", {
          headers: { authorization: "Bearer dedicated-secret" },
        });
        assert.equal(isSentryTestAuthorized(request), true);
      },
    );
  });

  it("rejects the secret when passed only as a query string", () => {
    withEnv({ SENTRY_VERIFY_SECRET: "dedicated-secret" }, () => {
      const request = new Request(
        "https://example.com/api/sentry-verify?secret=dedicated-secret",
      );
      assert.equal(isSentryTestAuthorized(request), false);
    });
  });

  it("source no longer reads process.env.CRON_SECRET anywhere in the verify module", () => {
    const src = readFileSync(
      new URL("../../monitoring/sentry-verify.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(src, /process\.env\.CRON_SECRET/);
  });
});
