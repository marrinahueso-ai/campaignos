import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(): string {
  return readFileSync(new URL("../actions.ts", import.meta.url), "utf8");
}

/**
 * Security regression guard: AI Brain settings (voice/tone profile +
 * Training Library documents) previously only required an active
 * organization (getLatestOrganization) — same missing-permission-gate class
 * already fixed for organization-profile and organization-workspace
 * mutations. Any active org member, not just admins, could otherwise rewrite
 * the org's AI voice/tone profile or upload/delete training documents that
 * feed AI-generated content org-wide.
 */
describe("AI Brain actions — manage_people gate", () => {
  it("requireOrganizationId checks manage_people before returning an organizationId", () => {
    const src = readSrc();
    assert.match(
      src,
      /import \{ requirePermission \} from "@\/lib\/access-templates\/effective-access";/,
    );
    const fnStart = src.indexOf("async function requireOrganizationId(");
    assert.ok(fnStart >= 0, "requireOrganizationId not found");
    const fnEnd = src.indexOf("\n}\n", fnStart);
    const body = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);
    assert.match(body, /requirePermission\("manage_people"\)/);
  });

  it("saveAiBrainProfileAction, uploadTrainingDocumentAction, and deleteTrainingDocumentAction all resolve org via the gated helper", () => {
    const src = readSrc();
    for (const fn of [
      "saveAiBrainProfileAction",
      "uploadTrainingDocumentAction",
      "deleteTrainingDocumentAction",
    ]) {
      const fnStart = src.indexOf(`export async function ${fn}(`);
      assert.ok(fnStart >= 0, `${fn} not found`);
      const fnEnd = src.indexOf("\n}\n", fnStart);
      const body = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);
      assert.match(
        body,
        /requireOrganizationId\(\)/,
        `${fn} must call the permission-gated requireOrganizationId()`,
      );
    }
  });
});
