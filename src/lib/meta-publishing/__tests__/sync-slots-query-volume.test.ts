import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSyncSlotsSource(): string {
  return readFileSync(path.join(root, "lib/meta-publishing/sync-slots.ts"), "utf8");
}

/**
 * Phase 3 — syncMetaPublicationSlots previously issued one extra
 * `meta_publication_slots` SELECT per (milestone x META_PUBLISH_TARGETS)
 * combination just to check whether a slot already existed, even though
 * the whole table's rows for this event were already fetched once via
 * `existingSlotsResult` a few lines above. That redundant read was the
 * dominant driver of this table's production query volume (100k+ GETs /
 * 80k+ PATCHes over 14 days, p95 tail latency in the tens of seconds).
 *
 * These tests pin the fix: the per-target existence check must be served
 * from an in-memory index built off the single bulk fetch, not a fresh
 * network round trip — while every write decision (skip published, cancel
 * disabled targets, cancelled->draft, preserve schedule for committed
 * statuses, insert when missing) stays byte-for-byte the same.
 */
describe("syncMetaPublicationSlots — eliminates redundant per-target existence query", () => {
  const source = readSyncSlotsSource();

  it("builds an in-memory index from the single bulk existingSlotsResult fetch", () => {
    assert.match(source, /const existingSlotByKey = new Map/);
    assert.match(
      source,
      /existingSlotByKey\.set\(\s*`\$\{row\.relative_day\}:\$\{row\.platform\}:\$\{row\.placement\}`/,
    );
  });

  it("looks up existing slots from the index inside the target loop", () => {
    assert.match(
      source,
      /const existing = existingSlotByKey\.get\(\s*`\$\{milestone\.relativeDay\}:\$\{target\.platform\}:\$\{target\.placement\}`/,
    );
  });

  it("no longer issues a per-target SELECT to check slot existence", () => {
    // The only remaining `.select(...)` chains against meta_publication_slots
    // should be the two bulk/event-scoped or day-scoped reads, never a
    // per-(relative_day, platform, placement) existence probe inside the
    // target loop.
    assert.doesNotMatch(
      source,
      /\.select\("\*"\)\s*\.eq\("event_id", eventId\)\s*\.eq\("relative_day", milestone\.relativeDay\)\s*\.eq\("platform", target\.platform\)\s*\.eq\("placement", target\.placement\)\s*\.maybeSingle\(\)/,
    );
  });

  it("preserves every existing write-decision branch unchanged", () => {
    assert.match(source, /row\.status === "published" \|\| row\.status === "cancelled"/);
    assert.match(source, /status: "cancelled", updated_at: now/);
    assert.match(source, /if \(row\.status === "cancelled"\) \{/);
    assert.match(source, /status: "draft",/);
    assert.match(source, /const preserveSchedule = isCommittedMetaSlotStatus\(row\.status\)/);
    assert.match(source, /await supabase\.from\("meta_publication_slots"\)\.insert\(/);
  });

  it("keeps the orphan-day delete loop reading from the same bulk fetch", () => {
    assert.match(
      source,
      /for \(const slot of existingSlotsResult\.data \?\? \[\]\) \{\s*const row = slot as MetaPublicationSlotRow;\s*if \(activeDays\.has\(row\.relative_day\)\) \{/,
    );
  });
});
