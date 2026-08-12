import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(): string {
  return readFileSync(path.join(root, "lib/playbooks/queries.ts"), "utf8");
}

/**
 * Phase 3 — getEventPlaybookData is read from many independent call sites
 * for the same event within a single request/render (communication items
 * sync, planning hub render, AI grounding/strategy context assembly,
 * calendar preview). It was not request-deduped, so those call sites each
 * paid for their own event_playbook_assignments + event_communication_steps
 * round trips. Wrapping it in React.cache() (same pattern already used for
 * getPlaybookById in this file) removes the duplicate network round trips
 * without changing what data is returned.
 */
describe("getEventPlaybookData — request-level cache", () => {
  const source = readSource();

  it("is wrapped in React cache() for per-request dedup", () => {
    assert.match(
      source,
      /export const getEventPlaybookData = cache\(async function getEventPlaybookData\(/,
    );
  });

  it("still resolves assignment, playbook, and ordered steps the same way", () => {
    assert.match(source, /\.from\("event_playbook_assignments"\)/);
    assert.match(source, /getPlaybookById\(assignment\.playbookId\)/);
    assert.match(
      source,
      /\.from\("event_communication_steps"\)\s*\.select\("\*"\)\s*\.eq\("event_id", eventId\)\s*\.order\("sort_order", \{ ascending: true \}\)/,
    );
  });
});
