import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVENTS_ALSO_AHEAD_COLLAPSED_COUNT,
  eventsHomeAlsoAheadEvents,
  resolveSelectedEventsHomeEvent,
  sliceAlsoAheadEvents,
} from "@/lib/events/events-home-selection";
import type { Event } from "@/types";

function event(id: string, date = "2026-08-10"): Event {
  return {
    id,
    organizationId: "org",
    schoolYearId: "sy",
    title: id,
    description: null,
    date,
    time: null,
    endTime: null,
    location: null,
    category: null,
    eventType: "general",
    status: "scheduled",
    communicationStrategy: "social_campaign",
    playbookId: null,
    planningQuickLinks: {},
    planningVendors: [],
    createdAt: "",
    updatedAt: "",
  } as Event;
}

describe("events-home-selection", () => {
  it("prefers a valid URL event id over default", () => {
    const list = [event("a"), event("b"), event("c")];
    assert.equal(
      resolveSelectedEventsHomeEvent({
        accessibleEvents: list,
        requestedEventId: "b",
      })?.id,
      "b",
    );
  });

  it("ignores inaccessible requested ids and falls back", () => {
    const list = [event("a"), event("b")];
    assert.equal(
      resolveSelectedEventsHomeEvent({
        accessibleEvents: list,
        requestedEventId: "other-org",
      })?.id,
      "a",
    );
  });

  it("keeps preferred selection when still in the filtered list", () => {
    const list = [event("a"), event("b")];
    assert.equal(
      resolveSelectedEventsHomeEvent({
        accessibleEvents: list,
        requestedEventId: null,
        preferredEventId: "b",
      })?.id,
      "b",
    );
  });

  it("builds Also Ahead without the selected event and collapses", () => {
    const list = [event("a"), event("b"), event("c"), event("d"), event("e")];
    const ahead = eventsHomeAlsoAheadEvents(list, "a");
    assert.equal(ahead.length, 4);
    assert.ok(!ahead.some((row) => row.id === "a"));
    assert.equal(
      sliceAlsoAheadEvents(ahead, false).length,
      EVENTS_ALSO_AHEAD_COLLAPSED_COUNT,
    );
    assert.equal(sliceAlsoAheadEvents(ahead, true).length, 4);
  });
});
