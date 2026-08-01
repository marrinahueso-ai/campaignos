import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isServerActionTransportError } from "../server-action-transport.ts";

describe("isServerActionTransportError", () => {
  it("matches Next.js unexpected server-action responses (e.g. 504 HTML)", () => {
    assert.equal(
      isServerActionTransportError(
        new Error("An unexpected response was received from the server."),
      ),
      true,
    );
  });

  it("matches abort and common network failures", () => {
    assert.equal(
      isServerActionTransportError(
        Object.assign(new Error("The operation was aborted."), {
          name: "AbortError",
        }),
      ),
      true,
    );
    assert.equal(
      isServerActionTransportError(new TypeError("Failed to fetch")),
      true,
    );
    assert.equal(
      isServerActionTransportError(new TypeError("Load failed")),
      true,
    );
  });

  it("matches gateway status wording", () => {
    assert.equal(
      isServerActionTransportError(new Error("HTTP 504 Gateway Timeout")),
      true,
    );
    assert.equal(
      isServerActionTransportError(new Error("502 Bad Gateway")),
      true,
    );
  });

  it("does not match ordinary product errors", () => {
    assert.equal(
      isServerActionTransportError(
        new Error("Artwork generation failed. Please try again."),
      ),
      false,
    );
    assert.equal(
      isServerActionTransportError(new Error("Could not verify AI credits.")),
      false,
    );
    assert.equal(isServerActionTransportError(null), false);
  });
});
