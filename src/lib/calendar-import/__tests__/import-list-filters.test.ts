import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterImportListEvents,
  filterImportListEventsBySearch,
  formatImportSourceLabel,
  matchesImportListSearch,
  matchesImportSourceFilter,
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
    importSource: overrides.importSource,
    playbookId: overrides.playbookId ?? null,
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

  it("matches import source labels", () => {
    const event = importedEvent({
      title: "Concert",
      date: "2026-12-01",
      importSource: "google",
    });
    assert.equal(matchesImportListSearch(event, "google"), true);
  });
});

describe("matchesImportSourceFilter", () => {
  it("filters google, subscribe, file, and other sources", () => {
    const google = importedEvent({
      title: "A",
      date: "2026-01-01",
      importSource: "google",
    });
    const feed = importedEvent({
      title: "B",
      date: "2026-01-02",
      importSource: "subscribe",
    });
    const pdf = importedEvent({
      title: "C",
      date: "2026-01-03",
      importSource: "ai_parse",
    });
    const manual = importedEvent({
      title: "D",
      date: "2026-01-04",
      importSource: null,
    });

    assert.equal(matchesImportSourceFilter(google, "google"), true);
    assert.equal(matchesImportSourceFilter(feed, "subscribe"), true);
    assert.equal(matchesImportSourceFilter(pdf, "file"), true);
    assert.equal(matchesImportSourceFilter(manual, "other"), true);
    assert.equal(matchesImportSourceFilter(google, "file"), false);
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
      importSource: "google",
    }),
    importedEvent({
      id: "early-release",
      title: "Early Release Day",
      date: "2026-09-01",
      category: "Early Release",
      importSource: "subscribe",
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

  it("combines search and source filter", () => {
    assert.deepEqual(
      filterImportListEvents(events, {
        search: "",
        sourceFilter: "google",
      }).map((event) => event.id),
      ["festival"],
    );
  });
});

describe("formatImportSourceLabel", () => {
  it("labels known import sources", () => {
    assert.equal(formatImportSourceLabel("google"), "Google Calendar");
    assert.equal(formatImportSourceLabel("subscribe"), "School RSS Feed");
    assert.equal(formatImportSourceLabel("ai_parse"), "PDF Import");
  });
});
