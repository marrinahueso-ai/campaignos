import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarItemMatchesSearch,
  filterCalendarItemsBySearch,
} from "../calendar-home-search.ts";
import type { PlanningCalendarItem } from "../../../types/communications-calendar.ts";

function itemStub(
  partial: Partial<PlanningCalendarItem> & Pick<PlanningCalendarItem, "id">,
): PlanningCalendarItem {
  return {
    sourceId: partial.sourceId ?? "src-1",
    sourceType: partial.sourceType ?? "event",
    eventId: partial.eventId ?? "event-1",
    eventTitle: partial.eventTitle ?? "Fall Festival",
    title: partial.title ?? "Fall Festival",
    timelineStepTitle: partial.timelineStepTitle ?? null,
    timelineStepId: partial.timelineStepId ?? null,
    communicationItemId: partial.communicationItemId ?? null,
    channel: partial.channel ?? null,
    communicationType: partial.communicationType ?? "event",
    scheduledDate: partial.scheduledDate ?? "2026-10-15",
    status: partial.status ?? "scheduled",
    assignedUser: partial.assignedUser ?? null,
    draftContent: partial.draftContent ?? null,
    draftStatus: partial.draftStatus ?? null,
    artworkStatus: partial.artworkStatus ?? null,
    approvalStatus: partial.approvalStatus ?? null,
    publishStatus: partial.publishStatus ?? null,
    versionNumber: partial.versionNumber ?? null,
    scheduledAt: partial.scheduledAt ?? null,
    ...partial,
  };
}

describe("calendarItemMatchesSearch", () => {
  it("matches event names, captions, dates, times, and people", () => {
    const event = itemStub({
      id: "1",
      eventTitle: "Fall Festival",
      title: "Fall Festival",
      scheduledDate: "2026-10-15",
    });

    const post = itemStub({
      id: "2",
      eventTitle: "Fall Festival",
      title: "Save the date — Meta",
      timelineStepTitle: "Save the date",
      communicationType: "meta_milestone",
      sourceType: "meta_milestone",
      scheduledDate: "2026-09-01",
      scheduledAt: "2026-09-01T14:00:00.000Z",
      draftContent: "Join us on the lawn for games and food!",
      assignedUser: "Alex Rivera",
      publishStatus: "scheduled",
    });

    assert.equal(calendarItemMatchesSearch(event, "fall festival"), true);
    assert.equal(calendarItemMatchesSearch(post, "save the date"), true);
    assert.equal(calendarItemMatchesSearch(post, "join us on the lawn"), true);
    assert.equal(calendarItemMatchesSearch(post, "alex"), true);
    assert.equal(calendarItemMatchesSearch(event, "october"), true);
    assert.equal(calendarItemMatchesSearch(event, "10/15"), true);
    assert.equal(calendarItemMatchesSearch(post, "9:00"), true);
    assert.equal(calendarItemMatchesSearch(post, "scheduled"), true);
    assert.equal(calendarItemMatchesSearch(event, "winter gala"), false);
    assert.equal(calendarItemMatchesSearch(event, "   "), true);
  });

  it("filters items when query is non-empty", () => {
    const items = [
      itemStub({ id: "1", eventTitle: "Fall Festival", title: "Fall Festival" }),
      itemStub({
        id: "2",
        eventTitle: "Winter Gala",
        title: "Winter Gala",
        scheduledDate: "2026-12-05",
      }),
    ];

    assert.deepEqual(filterCalendarItemsBySearch(items, ""), items);
    assert.equal(filterCalendarItemsBySearch(items, "winter").length, 1);
    assert.equal(filterCalendarItemsBySearch(items, "gala").length, 1);
    assert.equal(filterCalendarItemsBySearch(items, "missing").length, 0);
  });
});
