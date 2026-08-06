import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterEventsToSchoolYearWindow,
  schoolYearGoogleTimeBounds,
} from "@/lib/calendar-import/school-year-event-window";

describe("filterEventsToSchoolYearWindow", () => {
  it("keeps dates inside Jul–Jun for a 2025-2026 label", () => {
    const kept = filterEventsToSchoolYearWindow(
      [
        { date: "2025-06-30", name: "prior june" },
        { date: "2025-07-01", name: "year start" },
        { date: "2026-01-15", name: "mid" },
        { date: "2026-06-30", name: "year end" },
        { date: "2026-07-01", name: "next july" },
      ],
      "2025-2026",
    );
    assert.deepEqual(
      kept.map((e) => e.name),
      ["year start", "mid", "year end"],
    );
  });

  it("drops prior-school-year feed rows", () => {
    const kept = filterEventsToSchoolYearWindow(
      [
        { date: "2024-09-10", name: "old fall" },
        { date: "2025-09-10", name: "current fall" },
      ],
      "2025-2026",
    );
    assert.deepEqual(
      kept.map((e) => e.name),
      ["current fall"],
    );
  });
});

describe("schoolYearGoogleTimeBounds", () => {
  it("uses school-year Jul–Jun ISO bounds", () => {
    const bounds = schoolYearGoogleTimeBounds("2025-2026");
    assert.equal(bounds.timeMin, "2025-07-01T00:00:00.000Z");
    assert.equal(bounds.timeMax, "2026-06-30T23:59:59.999Z");
  });
});
