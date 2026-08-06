import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterDashboardUnderfilledVolunteerEvents } from "../dashboard-volunteer-events.ts";

describe("filterDashboardUnderfilledVolunteerEvents", () => {
  const today = "2026-08-06";

  it("rolls off past dates and keeps today and future underfilled events", () => {
    const rows = filterDashboardUnderfilledVolunteerEvents(
      [
        { id: "past", needsPeople: true, date: "2026-08-05" },
        { id: "today", needsPeople: true, date: "2026-08-06" },
        { id: "future", needsPeople: true, date: "2026-09-09" },
        { id: "covered", needsPeople: false, date: "2026-09-09" },
      ],
      today,
    );

    assert.deepEqual(
      rows.map((row) => row.id),
      ["today", "future"],
    );
  });

  it("returns empty when every underfilled event is in the past", () => {
    const rows = filterDashboardUnderfilledVolunteerEvents(
      [
        { id: "a", needsPeople: true, date: "2026-08-05" },
        { id: "b", needsPeople: true, date: "2026-07-01" },
      ],
      today,
    );

    assert.equal(rows.length, 0);
  });
});
