import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("AI credits org resolution tenancy", () => {
  it("requires event access before admin event→org billing", () => {
    const source = readFileSync(join(here, "../credits.ts"), "utf8");
    assert.match(source, /getEventById/);
    assert.match(source, /assertActiveMembershipInOrganization/);
    const fn = source.slice(
      source.indexOf("async function resolveOrganizationIdForCredits"),
    );
    // eventId path must check access before admin lookup; must not return
    // a bare client organizationId first.
    const eventAccessIdx = fn.indexOf("getEventById");
    const adminLookupIdx = fn.indexOf("resolveOrganizationIdFromEvent");
    const membershipIdx = fn.indexOf("assertActiveMembershipInOrganization");
    assert.ok(eventAccessIdx >= 0);
    assert.ok(adminLookupIdx > eventAccessIdx);
    assert.ok(membershipIdx > adminLookupIdx);
    assert.doesNotMatch(
      fn.slice(0, eventAccessIdx),
      /if \(input\.organizationId\?\.trim\(\)\) return input\.organizationId/,
    );
  });
});
