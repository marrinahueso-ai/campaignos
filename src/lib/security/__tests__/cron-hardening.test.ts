import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isSentryTestAuthorized } from "@/lib/monitoring/sentry-verify";

const CRON_ROUTE_DIRS = [
  "calendar-subscribe-sync",
  "google-calendar-sync",
  "inbox-sync",
  "insights-sync",
  "manual-upload-emails",
  "meta-publish",
  "meta-token-health",
  "newsletter-scheduled-sends",
  "story-post-reminders",
  "volunteer-sync",
];

function readCronRouteSrc(dir: string): string {
  return readFileSync(
    new URL(`../../../app/api/cron/${dir}/route.ts`, import.meta.url),
    "utf8",
  );
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
  for (const dir of CRON_ROUTE_DIRS) {
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
