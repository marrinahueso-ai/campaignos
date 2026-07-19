import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSentryEnabled, scrubSentryEvent } from "../sentry-privacy.ts";

describe("isSentryEnabled", () => {
  const original = {
    SENTRY_ENABLED: process.env.SENTRY_ENABLED,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV,
  };

  function restore() {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  it("defaults off in development even with a DSN", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://example@o.ingest.sentry.io/1";
    delete process.env.SENTRY_ENABLED;
    assert.equal(isSentryEnabled(), false);
    restore();
  });

  it("allows opt-in with SENTRY_ENABLED=true in development", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://example@o.ingest.sentry.io/1";
    process.env.SENTRY_ENABLED = "true";
    assert.equal(isSentryEnabled(), true);
    restore();
  });

  it("stays on in production when DSN is set", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://example@o.ingest.sentry.io/1";
    delete process.env.SENTRY_ENABLED;
    assert.equal(isSentryEnabled(), true);
    restore();
  });
});

describe("scrubSentryEvent Safari Load failed filter", () => {
  it("drops empty-stack Load failed", () => {
    const result = scrubSentryEvent({
      exception: {
        values: [{ type: "TypeError", value: "Load failed" }],
      },
    });
    assert.equal(result, null);
  });

  it("drops Load failed with only Next chunk frames", () => {
    const result = scrubSentryEvent({
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Load failed (heyralli.com)",
            stacktrace: {
              frames: [
                {
                  filename: "app:///_next/static/chunks/7953-77e4517207ddf255.js",
                },
              ],
            },
          },
        ],
      },
    });
    assert.equal(result, null);
  });

  it("keeps Load failed that includes app source frames", () => {
    const event = {
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Load failed",
            stacktrace: {
              frames: [
                { filename: "app:///_next/static/chunks/framework.js" },
                { filename: "webpack-internal:///./src/lib/foo.ts" },
              ],
            },
          },
        ],
      },
    };
    const result = scrubSentryEvent(event);
    assert.notEqual(result, null);
  });
});
