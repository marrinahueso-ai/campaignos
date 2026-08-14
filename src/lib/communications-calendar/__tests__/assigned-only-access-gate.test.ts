import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

/**
 * Security regression guard: getEventById() already fails closed for
 * assigned-only members trying to reach an event outside their assignment
 * (org-level RLS on the underlying tables does not enforce that narrower
 * app-layer scope). Both files below previously ignored that result and
 * fell through to session-client queries/mutations scoped only by
 * event_id, which RLS still allowed.
 */
describe("loadCalendarItemPreview — assigned-only IDOR guard", () => {
  it("returns the empty preview immediately when getEventById denies access", () => {
    const src = readSrc("../calendar-item-preview.ts");
    const fnStart = src.indexOf("export async function loadCalendarItemPreview(");
    assert.ok(fnStart >= 0);
    const fnBody = src.slice(fnStart, fnStart + 1200);
    assert.match(fnBody, /const event = await getEventById\(input\.eventId\);/);
    assert.match(fnBody, /if \(!event\) \{\s*return empty;\s*\}/);
  });
});

describe("reschedulePlanningItem — assigned-only IDOR guard", () => {
  it("resolves the target event and checks getEventById before any mutation branch", () => {
    const src = readSrc("../planning-mutations.ts");
    assert.match(src, /async function resolveEventIdForPlanningItem\(/);
    const fnStart = src.indexOf("export async function reschedulePlanningItem(");
    assert.ok(fnStart >= 0);
    const switchIndex = src.indexOf("switch (sourceType)", fnStart);
    assert.ok(switchIndex > fnStart);
    const guardBody = src.slice(fnStart, switchIndex);
    assert.match(guardBody, /resolveEventIdForPlanningItem\(/);
    assert.match(guardBody, /const event = await getEventById\(targetEventId\);/);
    assert.match(guardBody, /if \(!event\) \{\s*return false;\s*\}/);
  });
});
