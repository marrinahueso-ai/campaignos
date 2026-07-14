import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scrubSentryEvent } from "../sentry-privacy.ts";

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
