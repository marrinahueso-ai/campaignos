import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(): string {
  return readFileSync(new URL("../profile-actions.ts", import.meta.url), "utf8");
}

/**
 * Security regression guard: updateOrganizationProfileAction previously only
 * required an active organization (getCurrentOrganization), matching the
 * same missing-permission-gate class already fixed for
 * organization-workspace roles/roster/committee mutations. Any active org
 * member — not just admins — could otherwise rename the school, change its
 * address, timezone, principal, etc.
 */
describe("updateOrganizationProfileAction — manage_people gate", () => {
  it("imports requirePermission and checks manage_people before mutating", () => {
    const src = readSrc();
    assert.match(
      src,
      /import \{ requirePermission \} from "@\/lib\/access-templates\/effective-access";/,
    );
    const fnStart = src.indexOf("export async function updateOrganizationProfileAction(");
    assert.ok(fnStart >= 0);
    const body = src.slice(fnStart, fnStart + 1200);
    assert.match(body, /requirePermission\("manage_people"\)/);
    const permIdx = body.indexOf('requirePermission("manage_people")');
    const updateIdx = body.indexOf("updateOrganizationProfile({");
    assert.ok(permIdx >= 0 && updateIdx > permIdx, "permission check must run before the mutation");
  });
});
