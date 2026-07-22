import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  applyReviewEventFilters,
  filterReviewEvents,
  filterReviewEventsByDate,
  getPastReviewEventIds,
  isPastReviewEvent,
  matchesReviewSearch,
} from "../review-filters.ts";
import type { CalendarReviewEvent } from "../../../types/calendar-review.ts";

function reviewEvent(
  overrides: Partial<CalendarReviewEvent> &
    Pick<CalendarReviewEvent, "name" | "date">,
): CalendarReviewEvent {
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name,
    date: overrides.date,
    category: overrides.category ?? "School Event",
    status: overrides.status ?? "ready",
    communicationStrategy: overrides.communicationStrategy ?? "full_campaign",
    importSource: overrides.importSource ?? null,
    importExternalId: overrides.importExternalId ?? null,
    existingEventId: overrides.existingEventId ?? null,
    matchReason: overrides.matchReason ?? null,
    applyUpdate: overrides.applyUpdate,
  };
}

const today = "2026-07-21";

describe("isPastReviewEvent", () => {
  it("treats dates before today as past and today as not past", () => {
    assert.equal(
      isPastReviewEvent(reviewEvent({ name: "Past", date: "2025-07-30" }), today),
      true,
    );
    assert.equal(
      isPastReviewEvent(reviewEvent({ name: "Today", date: today }), today),
      false,
    );
    assert.equal(
      isPastReviewEvent(
        reviewEvent({ name: "Future", date: "2026-08-01" }),
        today,
      ),
      false,
    );
  });
});

describe("matchesReviewSearch", () => {
  it("matches name, category, and match reason case-insensitively", () => {
    const event = reviewEvent({
      name: "Back to School Fair",
      date: "2026-08-01",
      category: "PTO Event",
      matchReason: "New event — will be created",
    });

    assert.equal(matchesReviewSearch(event, "school"), true);
    assert.equal(matchesReviewSearch(event, "pto"), true);
    assert.equal(matchesReviewSearch(event, "will be created"), true);
    assert.equal(matchesReviewSearch(event, "carnival"), false);
    assert.equal(matchesReviewSearch(event, "   "), true);
  });

  it("matches year, month, and formatted / slash date variants", () => {
    const event = reviewEvent({
      name: "Last Year Fair",
      date: "2025-07-30",
      category: "PTO Event",
    });

    assert.equal(matchesReviewSearch(event, "2025"), true);
    assert.equal(matchesReviewSearch(event, "jul"), true);
    assert.equal(matchesReviewSearch(event, "July"), true);
    assert.equal(matchesReviewSearch(event, "july 30"), true);
    assert.equal(matchesReviewSearch(event, "Jul 30, 2025"), true);
    assert.equal(matchesReviewSearch(event, "07/30"), true);
    assert.equal(matchesReviewSearch(event, "7/30/2025"), true);
    assert.equal(matchesReviewSearch(event, "2025-07-30"), true);
    assert.equal(matchesReviewSearch(event, "2024"), false);
    assert.equal(matchesReviewSearch(event, "august"), false);
  });
});

describe("filterReviewEvents / date / apply", () => {
  const events = [
    reviewEvent({
      id: "past-dup",
      name: "Last Year Fair",
      date: "2025-07-30",
      status: "duplicate",
      category: "PTO Event",
    }),
    reviewEvent({
      id: "future-new",
      name: "Fall Festival",
      date: "2026-10-15",
      status: "ready",
      category: "School Event",
    }),
    reviewEvent({
      id: "future-update",
      name: "Early Release Day",
      date: "2026-09-01",
      status: "update",
      category: "Early Release",
    }),
  ];

  it("filters by status via summary-card filters", () => {
    assert.equal(filterReviewEvents(events, "duplicates").length, 1);
    assert.equal(filterReviewEvents(events, "updates")[0]?.id, "future-update");
    assert.equal(filterReviewEvents(events, "PTO Event")[0]?.id, "past-dup");
  });

  it("filters upcoming vs past relative to today", () => {
    assert.deepEqual(
      filterReviewEventsByDate(events, "past", today).map((event) => event.id),
      ["past-dup"],
    );
    assert.deepEqual(
      filterReviewEventsByDate(events, "upcoming", today).map((event) => event.id),
      ["future-new", "future-update"],
    );
  });

  it("combines type filter, date filter, and search", () => {
    const filtered = applyReviewEventFilters(events, {
      filter: "all",
      dateFilter: "upcoming",
      search: "festival",
      today,
    });
    assert.deepEqual(
      filtered.map((event) => event.id),
      ["future-new"],
    );
  });

  it("returns past event ids for mass archive", () => {
    assert.deepEqual(getPastReviewEventIds(events, today), ["past-dup"]);
  });

  it("searches by year across filtered upcoming/past sets", () => {
    const filtered = applyReviewEventFilters(events, {
      filter: "all",
      dateFilter: "all",
      search: "2025",
      today,
    });
    assert.deepEqual(
      filtered.map((event) => event.id),
      ["past-dup"],
    );
  });
});
