import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterEventsByDateInclusive } from "../event-date-filter.ts";
import type { Event } from "../../../types/index.ts";

function event(id: string, date: string): Event {
  return {
    id,
    date,
    title: id,
    status: "active",
  } as unknown as Event;
}

describe("filterEventsByDateInclusive", () => {
  it("keeps inclusive bounds and drops outside", () => {
    const events = [
      event("a", "2026-08-01"),
      event("b", "2026-08-15"),
      event("c", "2026-08-31"),
      event("d", "2026-09-01"),
    ];
    const month = filterEventsByDateInclusive(events, "2026-08-01", "2026-08-31");
    assert.deepEqual(
      month.map((e) => e.id),
      ["a", "b", "c"],
    );
  });

  it("supports week strip subset of a wider window", () => {
    const events = [
      event("before", "2026-08-02"),
      event("start", "2026-08-03"),
      event("mid", "2026-08-06"),
      event("end", "2026-08-10"),
      event("after", "2026-08-11"),
    ];
    const week = filterEventsByDateInclusive(events, "2026-08-03", "2026-08-10");
    assert.deepEqual(
      week.map((e) => e.id),
      ["start", "mid", "end"],
    );
  });
});
