import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("resolveScopedOrganizationId tenancy", () => {
  it("asserts active membership before trusting an explicit org id", () => {
    const source = readFileSync(join(here, "../org-scope.ts"), "utf8");
    assert.match(source, /assertActiveMembershipInOrganization/);
    assert.match(
      source,
      /Explicit client\/org ids are never trusted without an active membership assert/,
    );
    const fn = source.slice(source.indexOf("export async function resolveScopedOrganizationId"));
    const allowedIdx = fn.indexOf("assertActiveMembershipInOrganization");
    const returnIdx = fn.indexOf("return organizationId");
    assert.ok(allowedIdx >= 0);
    assert.ok(returnIdx > allowedIdx);
  });
});
