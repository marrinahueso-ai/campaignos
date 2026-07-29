import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventMatchesSearch,
  filterEventsHomeBySearch,
} from "../events-home-search.ts";
import type { Event } from "../../../types/index.ts";

function eventStub(
  partial: Partial<Event> & Pick<Event, "id" | "title">,
): Event {
  return {
    description: "",
    date: "2026-08-04",
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

const today = "2026-07-15";

describe("eventMatchesSearch", () => {
  it("matches title, description, location, and event type", () => {
    const event = eventStub({
      id: "1",
      title: "Back to School Fair",
      description: "Welcome families on the lawn",
      location: "Main campus",
      eventType: "fundraiser",
      category: "PTO Event",
    });

    assert.equal(eventMatchesSearch(event, "school fair", { today }), true);
    assert.equal(eventMatchesSearch(event, "lawn", { today }), true);
    assert.equal(eventMatchesSearch(event, "main campus", { today }), true);
    assert.equal(eventMatchesSearch(event, "fundraiser", { today }), true);
    assert.equal(eventMatchesSearch(event, "pto", { today }), true);
    assert.equal(eventMatchesSearch(event, "carnival", { today }), false);
    assert.equal(eventMatchesSearch(event, "   ", { today }), true);
  });

  it("matches responsible person name and organization title", () => {
    const event = eventStub({ id: "1", title: "Fair" });

    assert.equal(
      eventMatchesSearch(event, "jordan", {
        today,
        responsible: {
          displayName: "Jordan Lee",
          organizationTitle: "Communications Chair",
        },
      }),
      true,
    );
    assert.equal(
      eventMatchesSearch(event, "communications chair", {
        today,
        responsible: {
          displayName: "Jordan Lee",
          organizationTitle: "Communications Chair",
        },
      }),
      true,
    );
    assert.equal(
      eventMatchesSearch(event, "jordan", {
        today,
        responsible: {
          displayName: "Unassigned",
          organizationTitle: null,
        },
      }),
      false,
    );
  });

  it("matches ISO, formatted, month, weekday, and year date forms", () => {
    const event = eventStub({
      id: "1",
      title: "Fair",
      date: "2026-08-04",
    });

    assert.equal(eventMatchesSearch(event, "2026-08-04", { today }), true);
    assert.equal(eventMatchesSearch(event, "aug 4", { today }), true);
    assert.equal(eventMatchesSearch(event, "august 4", { today }), true);
    assert.equal(eventMatchesSearch(event, "august", { today }), true);
    assert.equal(eventMatchesSearch(event, "2026", { today }), true);
    assert.equal(eventMatchesSearch(event, "tue", { today }), true);
    assert.equal(eventMatchesSearch(event, "tuesday", { today }), true);
    assert.equal(eventMatchesSearch(event, "september", { today }), false);
  });

  it("matches march month names case-insensitively including abbreviations", () => {
    const event = eventStub({
      id: "1",
      title: "Spring Gala",
      date: "2026-03-15",
    });

    assert.equal(eventMatchesSearch(event, "march", { today }), true);
    assert.equal(eventMatchesSearch(event, "March", { today }), true);
    assert.equal(eventMatchesSearch(event, "mar", { today }), true);
    assert.equal(eventMatchesSearch(event, "2026-03-15", { today }), true);
  });

  it("matches status labels shown on cards", () => {
    assert.equal(
      eventMatchesSearch(
        eventStub({ id: "1", title: "Draft fair", status: "draft" }),
        "needs setup",
        { today },
      ),
      true,
    );
    assert.equal(
      eventMatchesSearch(
        eventStub({
          id: "2",
          title: "Ready fair",
          status: "scheduled",
          date: "2026-09-01",
        }),
        "ready",
        { today },
      ),
      true,
    );
    assert.equal(
      eventMatchesSearch(
        eventStub({
          id: "3",
          title: "Past fair",
          status: "scheduled",
          date: "2026-06-01",
        }),
        "follow-up",
        { today },
      ),
      true,
    );
    assert.equal(
      eventMatchesSearch(
        eventStub({
          id: "4",
          title: "Done fair",
          status: "published",
          date: "2026-06-01",
        }),
        "published",
        { today },
      ),
      true,
    );
  });

  it("matches school year label when provided", () => {
    const event = eventStub({
      id: "1",
      title: "Fair",
      schoolYearId: "sy-2026",
    });

    assert.equal(
      eventMatchesSearch(event, "school year", {
        today,
        schoolYearLabel: "2025–2026 School Year",
      }),
      true,
    );
    assert.equal(
      eventMatchesSearch(event, "2025", {
        today,
        schoolYearLabel: "2025–2026 School Year",
      }),
      true,
    );
    assert.equal(
      eventMatchesSearch(event, "2024-2025", {
        today,
        schoolYearLabel: "2025–2026 School Year",
      }),
      false,
    );
  });
});

describe("filterEventsHomeBySearch", () => {
  const events = [
    eventStub({ id: "fair", title: "Fall Festival", date: "2026-10-15" }),
    eventStub({
      id: "release",
      title: "Early Release",
      date: "2026-09-01",
    }),
    eventStub({
      id: "draft",
      title: "Spring Gala",
      status: "draft",
      date: "2026-03-01",
    }),
  ];

  it("filters by person and date while preserving event objects", () => {
    const filtered = filterEventsHomeBySearch(events, "october", (event) => ({
      today,
      responsible: {
        displayName: event.id === "fair" ? "Alex Kim" : "Unassigned",
        organizationTitle: null,
      },
    }));

    assert.deepEqual(
      filtered.map((event) => event.id),
      ["fair"],
    );
  });

  it("returns all events for empty search", () => {
    assert.equal(
      filterEventsHomeBySearch(events, "", () => ({ today })).length,
      3,
    );
  });
});
