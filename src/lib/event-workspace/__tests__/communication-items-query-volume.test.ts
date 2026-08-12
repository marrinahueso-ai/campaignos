import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(): string {
  return readFileSync(path.join(root, "lib/event-workspace/communication-items.ts"), "utf8");
}

/**
 * Phase 3 — ensureStepCommunicationItemsForEvent ran on every sync
 * (playbook edits, approvals, milestone changes, Meta slot sync, ...) and
 * issued one findCommunicationItemForStep SELECT per playbook step, even
 * though after the first run every step already has an item. That made the
 * common case (nothing to create) do just as many round trips as the rare
 * case (first-time creation) — a major contributor to communication_items'
 * production query volume (56k+ GETs / 14d).
 *
 * This pins the fix: a single bulk fetch determines which steps already
 * have an item, and ensureCommunicationItemForStep (unchanged, still
 * idempotent) is only invoked for steps that are actually missing one.
 */
describe("ensureStepCommunicationItemsForEvent — eliminates redundant per-step existence query", () => {
  const source = readSource();

  it("bulk-fetches existing step items once instead of probing per step", () => {
    assert.match(
      source,
      /const existingItems = await getStepCommunicationItemRowsForEvent\(eventId\)/,
    );
    assert.match(source, /const stepIdsWithItem = new Set/);
  });

  it("skips ensureCommunicationItemForStep when the bulk index already has the step", () => {
    assert.match(
      source,
      /if \(stepIdsWithItem\.has\(step\.id\)\) \{\s*ensured \+= 1;\s*continue;\s*\}/,
    );
  });

  it("still creates missing items via the existing idempotent helper", () => {
    assert.match(
      source,
      /const itemId = await ensureCommunicationItemForStep\(\s*eventId,\s*step\.id,\s*step\.channel,\s*\);/,
    );
  });

  it("keeps ensureCommunicationItemForStep's own check-then-insert safety net untouched", () => {
    assert.match(source, /const existing = await findCommunicationItemForStep\(stepId\);\s*if \(existing\) \{\s*return existing;\s*\}/);
    assert.match(source, /return findCommunicationItemForStep\(stepId\);/);
  });
});
