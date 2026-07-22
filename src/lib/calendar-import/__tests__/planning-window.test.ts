import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCalendarPlanningWindow } from "../../communications-calendar/planning-date-window.ts";

describe("resolveCalendarPlanningWindow", () => {
  it("extends into prior July when the next school year is activated early", () => {
    const window = resolveCalendarPlanningWindow("2026 - 2027", "2026-07-21");
    assert.equal(window.startDate, "2025-07-01");
    assert.equal(window.endDate, "2027-07-31");
    assert.ok("2025-07-30" >= window.startDate);
    assert.ok("2025-07-30" <= window.endDate);
  });

  it("uses August 1 once the labeled school year has started", () => {
    const window = resolveCalendarPlanningWindow("2026 - 2027", "2026-09-01");
    assert.equal(window.startDate, "2026-08-01");
    assert.equal(window.endDate, "2027-07-31");
  });
});
