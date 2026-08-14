import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Security regression guard: approveUnifiedItemAction's Create-with-AI
 * scheduling branch (not flyer/newsletter, which already gate on
 * approve_comms unconditionally) used to skip the approve_comms check
 * entirely whenever `assigned_user_id` was set, without ever confirming the
 * caller *was* that assignee. Any org member with plain event access could
 * approve (and trigger Meta publish) or request changes on an item assigned
 * to someone else. This pins the fix: an assignee exists -> only a formal
 * approver (approve_comms) or the matching assignee (user or role) may act.
 */
function readActionsSrc(): string {
  const path = fileURLToPath(new URL("../actions.ts", import.meta.url));
  return readFileSync(path, "utf8");
}

function extractFunctionBody(src: string, signature: string): string {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  // Slice to the next top-level export, which is far enough past the
  // scheduling branch for both approve and request-changes functions.
  const next = src.indexOf("\nexport async function", start + signature.length);
  return src.slice(start, next >= 0 ? next : undefined);
}

describe("approvals-scheduling actions — assignee-only approval gate", () => {
  it("imports isSchedulingRowAssignedToActor and getActiveMembership", () => {
    const src = readActionsSrc();
    assert.match(src, /isSchedulingRowAssignedToActor/);
    assert.match(
      src,
      /import \{\s*getActiveMembership,\s*getOrganizationUsers,?\s*\} from "@\/lib\/auth\/membership-queries";/,
    );
  });

  it("resolveCurrentApprovalActor builds an actor from the active membership", () => {
    const src = readActionsSrc();
    const helperStart = src.indexOf(
      "async function resolveCurrentApprovalActor(",
    );
    assert.ok(helperStart >= 0, "resolveCurrentApprovalActor not found");
    const helperBody = src.slice(helperStart, helperStart + 400);
    assert.match(helperBody, /getActiveMembership\(\)/);
    assert.match(helperBody, /organizationUserId:\s*membership\.user\.id/);
    assert.match(helperBody, /organizationRoleId:\s*membership\.user\.organizationRoleId/);
  });

  it("approveUnifiedItemAction never skips the check just because assigned_user_id is set", () => {
    const src = readActionsSrc();
    const body = extractFunctionBody(
      src,
      "export async function approveUnifiedItemAction(",
    );
    // The old bug: `!row.assigned_user_id && !approve_comms && <status>` —
    // the whole block was skipped whenever an assignee existed.
    assert.doesNotMatch(
      body,
      /!row\.assigned_user_id\s*&&\s*!\(await hasPermission\("approve_comms"\)\)\s*&&/,
    );
    assert.match(body, /isSchedulingRowAssignedToActor\(row, actor\)/);
    assert.match(body, /You are not the assigned approver for this item\./);
  });

  it("requestUnifiedChangesAction's scheduling branch also requires approve_comms or assignee match", () => {
    const src = readActionsSrc();
    const body = extractFunctionBody(
      src,
      "export async function requestUnifiedChangesAction(",
    );
    assert.match(body, /isSchedulingRowAssignedToActor\(\s*schedulingRow,/);
    assert.match(body, /hasPermission\("approve_comms"\)/);
  });
});
