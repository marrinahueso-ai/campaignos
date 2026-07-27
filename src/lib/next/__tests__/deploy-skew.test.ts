import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDeploySkewError } from "../deploy-skew.ts";

describe("isDeploySkewError", () => {
  it("matches stale webpack / chunk load failures", () => {
    assert.equal(
      isDeploySkewError(new Error("Loading chunk 42 failed")),
      true,
    );
    assert.equal(
      isDeploySkewError(
        Object.assign(new Error("Loading failed"), { name: "ChunkLoadError" }),
      ),
      true,
    );
    assert.equal(
      isDeploySkewError(
        new Error("Failed to fetch dynamically imported module: /_next/static/x.js"),
      ),
      true,
    );
  });

  it("matches Next.js stale Server Action / deployment skew", () => {
    assert.equal(
      isDeploySkewError(
        new Error(
          'Failed to find Server Action "abc123". This request might be from an older or newer deployment.',
        ),
      ),
      true,
    );
    assert.equal(
      isDeploySkewError(
        new Error("This request might be from an older or newer deployment."),
      ),
      true,
    );
  });

  it("does not match ordinary product / network errors", () => {
    assert.equal(isDeploySkewError(new Error("Stripe is not configured yet.")), false);
    assert.equal(isDeploySkewError(new Error("Could not start checkout.")), false);
    assert.equal(isDeploySkewError(new TypeError("Failed to fetch")), false);
    assert.equal(isDeploySkewError(null), false);
  });
});
