import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("Campaign Builder session access gates", () => {
  it("load and save require event access", () => {
    const source = readFileSync(join(here, "../session.ts"), "utf8");
    assert.match(source, /requireEventAccess\(eventId\)/);
    assert.match(source, /requireEventAccess\(session\.eventId\)/);

    const loadFn = source.slice(
      source.indexOf("export async function loadCampaignBuilderSessionAction"),
      source.indexOf("export async function saveCampaignBuilderSessionAction"),
    );
    assert.match(loadFn, /requireEventAccess/);
    assert.match(loadFn, /return null/);

    const saveFn = source.slice(
      source.indexOf("export async function saveCampaignBuilderSessionAction"),
    );
    const gateIdx = saveFn.indexOf("requireEventAccess(session.eventId)");
    const upsertIdx = saveFn.indexOf("campaign_builder_sessions");
    assert.ok(gateIdx >= 0);
    assert.ok(upsertIdx > gateIdx);
  });
});
