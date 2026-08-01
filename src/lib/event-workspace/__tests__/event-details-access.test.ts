import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("updateEventDetailsAction tenancy", () => {
  it("gates with getEventById before mutate (same pattern as overview)", () => {
    const source = readFileSync(join(here, "../actions.ts"), "utf8");
    const fnStart = source.indexOf("export async function updateEventDetailsAction");
    const fnEnd = source.indexOf("export async function updateEventOverviewAction");
    assert.ok(fnStart >= 0);
    assert.ok(fnEnd > fnStart);
    const fn = source.slice(fnStart, fnEnd);
    assert.match(fn, /getEventById\(eventId\)/);
    const gateIdx = fn.indexOf("getEventById(eventId)");
    const mutateIdx = fn.indexOf("updateEventDetails(eventId");
    assert.ok(gateIdx >= 0);
    assert.ok(mutateIdx > gateIdx);
  });
});
