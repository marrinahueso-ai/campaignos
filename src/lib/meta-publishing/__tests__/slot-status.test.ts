import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  COMMITTED_META_SLOT_STATUSES,
  isCommittedMetaSlotStatus,
} from "../slot-status.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("committed meta slot status", () => {
  it("treats queue + history statuses as committed", () => {
    for (const status of COMMITTED_META_SLOT_STATUSES) {
      assert.equal(isCommittedMetaSlotStatus(status), true);
    }
    assert.equal(isCommittedMetaSlotStatus("draft"), false);
    assert.equal(isCommittedMetaSlotStatus("cancelled"), false);
    assert.equal(isCommittedMetaSlotStatus(null), false);
  });

  it("sync keeps committed orphan relative_day slots (Publish Now / custom dates)", () => {
    const source = readFileSync(
      path.join(root, "lib/meta-publishing/sync-slots.ts"),
      "utf8",
    );
    assert.match(source, /isCommittedMetaSlotStatus\(row\.status\)/);
    assert.match(source, /isCommittedMetaSlotStatus\(slot\.status as string\)/);
    assert.doesNotMatch(
      source,
      /if \(row\.status === "published"\) \{\s*continue;\s*\}\s*await supabase\.from\("meta_publication_slots"\)\.delete/,
    );
  });

  it("Meta bundles merge orphan committed days into the planner list", () => {
    const source = readFileSync(
      path.join(root, "lib/meta-publishing/bundles.ts"),
      "utf8",
    );
    assert.match(source, /buildOrphanCommittedBundles/);
    assert.match(source, /\[\.\.\.bundles, \.\.\.orphanBundles\]/);
  });
});
