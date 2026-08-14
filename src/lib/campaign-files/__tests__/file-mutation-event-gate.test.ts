import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(): string {
  return readFileSync(new URL("../actions.ts", import.meta.url), "utf8");
}

/**
 * Security regression guard: updateCampaignFile/deleteCampaignFile in
 * mutations.ts only scope by file id (RLS-only, org-wide), so an
 * assigned-only member could otherwise update/delete a file on an event
 * outside their assignment, and a fileId/eventId mismatch from the client
 * went unchecked. requireCampaignFileEventAccess closes both gaps before
 * either mutation runs.
 */
describe("campaign-files actions — event access gate on update/delete", () => {
  it("defines requireCampaignFileEventAccess using getCampaignFileById + getEventById", () => {
    const src = readSrc();
    const start = src.indexOf("async function requireCampaignFileEventAccess(");
    assert.ok(start >= 0, "requireCampaignFileEventAccess not found");
    const body = src.slice(start, start + 900);
    assert.match(body, /getCampaignFileById\(fileId\)/);
    assert.match(body, /file\.eventId !== eventId/);
    assert.match(body, /getEventById\(eventId\)/);
  });

  it("updateCampaignFileAction checks access before calling updateCampaignFile", () => {
    const src = readSrc();
    const start = src.indexOf("export async function updateCampaignFileAction(");
    const end = src.indexOf("\nexport async function", start + 10);
    const body = src.slice(start, end >= 0 ? end : undefined);
    assert.match(body, /requireCampaignFileEventAccess\(fileId, eventId\)/);
    const accessIdx = body.indexOf("requireCampaignFileEventAccess");
    const callIdx = body.indexOf("updateCampaignFile(fileId");
    assert.ok(accessIdx >= 0 && callIdx > accessIdx, "access check must run before the mutation");
  });

  it("deleteCampaignFileAction checks access before calling deleteCampaignFile", () => {
    const src = readSrc();
    const start = src.indexOf("export async function deleteCampaignFileAction(");
    const body = src.slice(start);
    assert.match(body, /requireCampaignFileEventAccess\(fileId, eventId\)/);
    const accessIdx = body.indexOf("requireCampaignFileEventAccess");
    const callIdx = body.indexOf("deleteCampaignFile(fileId)");
    assert.ok(accessIdx >= 0 && callIdx > accessIdx, "access check must run before the mutation");
  });
});
