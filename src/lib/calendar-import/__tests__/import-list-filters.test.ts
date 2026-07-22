import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterImportListEventsBySearch,
  matchesImportListSearch,
} from "../import-list-filters.ts";
import type { CalendarImportedEventListItem } from "../../../types/communications-calendar.ts";

function importedEvent(
  overrides: Partial<CalendarImportedEventListItem> &
    Pick<CalendarImportedEventListItem, "title" | "date">,
): CalendarImportedEventListItem {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title,
    date: overrides.date,
    category: overrides.category ?? "School Event",
    communicationStrategy: overrides.communicationStrategy ?? "full_campaign",
  };
}

describe("matchesImportListSearch", () => {
  it("matches title and category case-insensitively", () => {
    const event = importedEvent({
      title: "Back to School Fair",
      date: "2026-08-01",
      category: "PTO Event",
    });

    assert.equal(matchesImportListSearch(event, "school"), true);
    assert.equal(matchesImportListSearch(event, "pto"), true);
    assert.equal(matchesImportListSearch(event, "carnival"), false);
    assert.equal(matchesImportListSearch(event, "   "), true);
  });

  it("matches year, month, and formatted / slash date variants", () => {
    const event = importedEvent({
      title: "Last Year Fair",
      date: "2025-07-30",
      category: "PTO Event",
    });

    assert.equal(matchesImportListSearch(event, "2025"), true);
    assert.equal(matchesImportListSearch(event, "jul"), true);
    assert.equal(matchesImportListSearch(event, "July"), true);
    assert.equal(matchesImportListSearch(event, "july 30"), true);
    assert.equal(matchesImportListSearch(event, "Jul 30, 2025"), true);
    assert.equal(matchesImportListSearch(event, "07/30"), true);
    assert.equal(matchesImportListSearch(event, "7/30/2025"), true);
    assert.equal(matchesImportListSearch(event, "2025-07-30"), true);
    assert.equal(matchesImportListSearch(event, "2024"), false);
    assert.equal(matchesImportListSearch(event, "august"), false);
  });
});

describe("filterImportListEventsBySearch", () => {
  const events = [
    importedEvent({
      id: "past-fair",
      title: "Last Year Fair",
      date: "2025-07-30",
      category: "PTO Event",
    }),
    importedEvent({
      id: "festival",
      title: "Fall Festival",
      date: "2026-10-15",
      category: "School Event",
    }),
    importedEvent({
      id: "early-release",
      title: "Early Release Day",
      date: "2026-09-01",
      category: "Early Release",
    }),
  ];

  it("filters by event name", () => {
    assert.deepEqual(
      filterImportListEventsBySearch(events, "festival").map((event) => event.id),
      ["festival"],
    );
  });

  it("filters by year", () => {
    assert.deepEqual(
      filterImportListEventsBySearch(events, "2025").map((event) => event.id),
      ["past-fair"],
    );
  });

  it("returns all events for empty search", () => {
    assert.equal(filterImportListEventsBySearch(events, "").length, 3);
  });
});
