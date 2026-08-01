import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("getCurrentOrganization legacy fallback", () => {
  it("fails closed in production before the unauthenticated latest-org path", () => {
    const source = readFileSync(join(here, "../organization-context.ts"), "utf8");
    assert.match(source, /NODE_ENV === "production"/);
    const fn = source.slice(source.indexOf("export const getCurrentOrganization"));
    const prodGuardIdx = fn.indexOf('NODE_ENV === "production"');
    const legacyIdx = fn.indexOf("getLatestOrganizationLegacy");
    assert.ok(prodGuardIdx >= 0);
    assert.ok(legacyIdx > prodGuardIdx);
  });
});
