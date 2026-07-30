import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterEventsHomeBySearch } from "../events-home-search.ts";
import {
  filterEventsHomeByLens,
  shouldApplyEventsHomeLensFilter,
} from "../events-home-summary.ts";
import type { Event } from "../../../types/index.ts";

function eventStub(
  partial: Partial<Event> & Pick<Event, "id" | "title" | "date">,
): Event {
  return {
    description: "",
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: "scheduled",
    category: null,
    eventType: null,
    communicationStrategy: "full_campaign",
    calendarImportId: null,
    eventOwner: null,
    approvalOrganizationRoleId: null,
    budget: null,
    volunteerNeeds: null,
    goal: null,
    expectedAttendance: null,
    planningQuickLinks: {},
    planningVendors: [],
    approvedSquareImageUrl: null,
    approvedSquareImageStatus: "open",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: null,
    ...partial,
  };
}

const today = "2026-07-28";

const events = [
  eventStub({
    id: "march",
    title: "Spring Gala",
    date: "2026-03-15",
  }),
  eventStub({
    id: "upcoming",
    title: "Fall Festival",
    date: "2026-08-15",
  }),
];

describe("shouldApplyEventsHomeLensFilter", () => {
  it("applies lens only when search is empty", () => {
    assert.equal(shouldApplyEventsHomeLensFilter(""), true);
    assert.equal(shouldApplyEventsHomeLensFilter("   "), true);
    assert.equal(shouldApplyEventsHomeLensFilter("march"), false);
  });
});

describe("filterEventsHomeByLens with search", () => {
  it("hides past March events on Upcoming when search is empty", () => {
    const filtered = filterEventsHomeByLens(events, "upcoming", today);
    assert.deepEqual(
      filtered.map((event) => event.id),
      ["upcoming"],
    );
  });

  it("shows March matches on Upcoming when search is active", () => {
    const searched = filterEventsHomeBySearch(events, "march", () => ({
      today,
    }));

    const filtered = filterEventsHomeByLens(searched, "upcoming", today, {
      applyLens: shouldApplyEventsHomeLensFilter("march"),
    });

    assert.deepEqual(
      filtered.map((event) => event.id),
      ["march"],
    );
  });

  it("matches March case-insensitively through the full pipeline", () => {
    for (const query of ["march", "March", "mar"]) {
      const searched = filterEventsHomeBySearch(events, query, () => ({ today }));
      const filtered = filterEventsHomeByLens(searched, "upcoming", today, {
        applyLens: shouldApplyEventsHomeLensFilter(query),
      });
      assert.deepEqual(
        filtered.map((event) => event.id),
        ["march"],
        `query "${query}" should find March event`,
      );
    }
  });
});

describe("filterEventsHomeByLens archived", () => {
  const archivedEvents = [
    eventStub({
      id: "old-fair",
      title: "Spring Fair",
      date: "2025-04-10",
      status: "archived",
    }),
    eventStub({
      id: "active-fair",
      title: "Fall Fair",
      date: "2026-08-15",
    }),
  ];

  it("shows only archived events on the Archived lens", () => {
    const filtered = filterEventsHomeByLens(archivedEvents, "archived", today);
    assert.deepEqual(
      filtered.map((event) => event.id),
      ["old-fair"],
    );
  });

  it("excludes archived events from Upcoming", () => {
    const filtered = filterEventsHomeByLens(archivedEvents, "upcoming", today);
    assert.deepEqual(
      filtered.map((event) => event.id),
      ["active-fair"],
    );
  });
});
