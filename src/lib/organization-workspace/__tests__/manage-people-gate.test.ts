import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Security regression guard: every organization-workspace roster/role/
 * committee mutation action must require the `manage_people` permission,
 * not just an active organization. RLS on these tables enforces org-
 * membership isolation only (not template permission keys — see
 * docs/engineering/access-control.md), so this app-layer check is the
 * only thing standing between a `view_only`/`contributor` seat and
 * org-wide roster/committee/role writes. `previewOrganizationRosterAction`
 * is intentionally excluded — it only parses client-supplied text/file
 * input and performs no read or write against organization data.
 */
function readActionsSrc(): string {
  const path = fileURLToPath(new URL("../actions.ts", import.meta.url));
  return readFileSync(path, "utf8");
}

const MUTATION_ACTIONS = [
  "createOrganizationRoleAction",
  "updateOrganizationRoleAction",
  "deleteOrganizationRoleAction",
  "createOrganizationMemberAction",
  "updateOrganizationMemberAction",
  "createRosterPersonAction",
  "removeRosterCommitteeAssignmentAction",
  "saveRosterCommitteeAssignmentAction",
  "deleteOrganizationMemberAction",
  "updateResponsibilityMatrixAction",
  "updateCommitteeDefaultAction",
  "applyOrganizationRosterAction",
  "createOrganizationCommitteeAction",
  "updateOrganizationCommitteeAction",
  "archiveOrganizationCommitteeAction",
  "restoreOrganizationCommitteeAction",
  "deleteOrganizationCommitteeAction",
  "clearAllOrganizationCommitteesAction",
  "clearOrganizationRosterImportAction",
];

function extractFunctionBody(src: string, name: string): string {
  const marker = `export async function ${name}(`;
  const start = src.indexOf(marker);
  assert.ok(start >= 0, `${name} not found in organization-workspace/actions.ts`);
  // Next export marks the end of this function for our purposes; last
  // function in the file falls back to end of source.
  const nextExport = src.indexOf("\nexport async function ", start + marker.length);
  return src.slice(start, nextExport >= 0 ? nextExport : undefined);
}

describe("organization-workspace actions — manage_people gate", () => {
  it("imports requirePermission from the EffectiveAccess module", () => {
    const src = readActionsSrc();
    assert.match(
      src,
      /import \{ requirePermission \} from "@\/lib\/access-templates\/effective-access";/,
    );
  });

  it("requireOrganizationIdWithManagePeople checks manage_people before returning an org id", () => {
    const src = readActionsSrc();
    const helperStart = src.indexOf(
      "async function requireOrganizationIdWithManagePeople(",
    );
    assert.ok(helperStart >= 0, "requireOrganizationIdWithManagePeople not found");
    const helperBody = src.slice(helperStart, helperStart + 600);
    assert.match(helperBody, /requirePermission\("manage_people"\)/);
  });

  for (const name of MUTATION_ACTIONS) {
    it(`${name} requires manage_people (via requireOrganizationIdWithManagePeople)`, () => {
      const src = readActionsSrc();
      const body = extractFunctionBody(src, name);
      assert.match(
        body,
        /requireOrganizationIdWithManagePeople\(\)/,
        `${name} must call requireOrganizationIdWithManagePeople(), not the bare org-only check`,
      );
    });
  }

  it("previewOrganizationRosterAction is intentionally read-only and unaffected", () => {
    const src = readActionsSrc();
    const body = extractFunctionBody(src, "previewOrganizationRosterAction");
    assert.doesNotMatch(body, /requireOrganizationId/);
  });
});
