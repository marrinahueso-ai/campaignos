import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const actions = readFileSync(join(root, "actions.ts"), "utf8");

/**
 * Assigned-only members must not be able to force artwork writes or a Meta
 * schedule repair sweep for events outside their assignment by calling these
 * server actions directly with an arbitrary eventId — every other mutation
 * action in this file gates on requireEventAccess() first, and these two
 * were missing it.
 */
describe("campaign-builder-v2 actions — event access gate", () => {
  it("approveAllAndScheduleAction requires event access before repairing Meta schedules", () => {
    const fnStart = actions.indexOf(
      "export async function approveAllAndScheduleAction(",
    );
    assert.ok(fnStart >= 0, "approveAllAndScheduleAction not found");
    const nextFnStart = actions.indexOf(
      "export async function saveDraftAction(",
    );
    const body = actions.slice(fnStart, nextFnStart);

    assert.match(body, /requireEventAccess\(eventId\)/);
    const accessIdx = body.indexOf("requireEventAccess(eventId)");
    const repairIdx = body.indexOf("repairCampaignBuilderMetaSchedulesForEvent");
    assert.ok(accessIdx >= 0 && repairIdx >= 0 && accessIdx < repairIdx);
  });

  it("syncAppliedMilestoneArtworkAction requires event access before writing artwork", () => {
    const fnStart = actions.indexOf(
      "export async function syncAppliedMilestoneArtworkAction(",
    );
    assert.ok(fnStart >= 0, "syncAppliedMilestoneArtworkAction not found");
    const body = actions.slice(fnStart, fnStart + 900);

    assert.match(body, /requireEventAccess\(input\.eventId\)/);
    const accessIdx = body.indexOf("requireEventAccess(input.eventId)");
    const syncIdx = body.indexOf("syncHeroFromMilestoneArtwork");
    assert.ok(accessIdx >= 0 && syncIdx >= 0 && accessIdx < syncIdx);
  });
});
