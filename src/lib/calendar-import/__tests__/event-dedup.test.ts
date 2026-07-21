import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildAiParseFingerprint,
  calendarEventDedupeKey,
  classifyReviewEventsAgainstExisting,
  fieldsMatchExisting,
  markWithinFileConflicts,
  partitionClassifiedReviewEvents,
} from "../event-dedup.ts";
import { normalizeIcsUid, parseIcsToReviewEvents } from "../parse-ics.ts";
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

describe("calendarEventDedupeKey", () => {
  it("normalizes whitespace and case like DB title+date matching", () => {
    assert.equal(
      calendarEventDedupeKey("  Book   Fair ", "2025-10-01"),
      calendarEventDedupeKey("book fair", "2025-10-01"),
    );
  });
});

describe("markWithinFileConflicts", () => {
  it("uses the same key as DB normalization for within-file conflicts", () => {
    const events = markWithinFileConflicts([
      reviewEvent({ name: "Book Fair", date: "2025-10-01" }),
      reviewEvent({ name: "  book   fair ", date: "2025-10-01" }),
    ]);
    assert.equal(events[0]?.status, "ready");
    assert.equal(events[1]?.status, "conflict");
    assert.match(events[1]?.matchReason ?? "", /this import/i);
  });
});

describe("classifyReviewEventsAgainstExisting", () => {
  it("skips when ICS UID matches and fields are unchanged", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-01",
          importSource: "ics",
          importExternalId: "uid-book-fair",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          importSource: "ics",
          importExternalId: "uid-book-fair",
        },
      ],
    );
    assert.equal(classified[0]?.status, "duplicate");
    assert.equal(classified[0]?.existingEventId, "evt-1");
  });

  it("marks update when same external id has a date change", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-08",
          importSource: "ics",
          importExternalId: "uid-book-fair",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          importSource: "ics",
          importExternalId: "uid-book-fair",
        },
      ],
    );
    assert.equal(classified[0]?.status, "update");
    assert.equal(classified[0]?.existingEventId, "evt-1");
    assert.match(classified[0]?.matchReason ?? "", /2025-10-01 → 2025-10-08/);
  });

  it("skips title+date match when there is no external id", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [reviewEvent({ name: "Spirit Night", date: "2025-11-05" })],
      [{ id: "evt-2", title: "Spirit Night", date: "2025-11-05" }],
    );
    assert.equal(classified[0]?.status, "duplicate");
  });

  it("creates a new event for same title on a different date without external id", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [reviewEvent({ name: "Spirit Night", date: "2025-11-12" })],
      [{ id: "evt-2", title: "Spirit Night", date: "2025-11-05" }],
    );
    assert.equal(classified[0]?.status, "ready");
    assert.equal(classified[0]?.existingEventId, null);
  });

  it("does not skip near-miss titles on the same day", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [reviewEvent({ name: "Book Fair Week", date: "2025-10-01" })],
      [{ id: "evt-1", title: "Book Fair", date: "2025-10-01" }],
    );
    assert.equal(classified[0]?.status, "ready");
  });

  it("matches Google ids after UID normalization", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Open House",
          date: "2025-09-10",
          importSource: "google",
          importExternalId: "google-event-123",
        }),
      ],
      [
        {
          id: "evt-g",
          title: "Open House",
          date: "2025-09-10",
          importSource: "google",
          importExternalId: "google-event-123",
        },
      ],
    );
    assert.equal(classified[0]?.status, "duplicate");
  });

  it("auto mode defaults update rows to applyUpdate true", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-08",
          importSource: "subscribe",
          importExternalId: "feed-uid-1",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          importSource: "subscribe",
          importExternalId: "feed-uid-1",
        },
      ],
      { mode: "auto" },
    );
    assert.equal(classified[0]?.status, "update");
    assert.equal(classified[0]?.applyUpdate, true);
  });
});

describe("partitionClassifiedReviewEvents", () => {
  it("respects Skip on update rows", () => {
    const partitioned = partitionClassifiedReviewEvents([
      reviewEvent({
        name: "A",
        date: "2025-01-01",
        status: "update",
        existingEventId: "e1",
        applyUpdate: false,
      }),
      reviewEvent({
        name: "B",
        date: "2025-01-02",
        status: "update",
        existingEventId: "e2",
        applyUpdate: true,
      }),
      reviewEvent({ name: "C", date: "2025-01-03", status: "ready" }),
    ]);
    assert.equal(partitioned.toUpdate.length, 1);
    assert.equal(partitioned.toUpdate[0]?.name, "B");
    assert.equal(partitioned.skippedDuplicates.length, 1);
    assert.equal(partitioned.toInsert.length, 1);
  });
});

describe("parseIcsToReviewEvents", () => {
  it("captures UID and strips Google suffix for google source", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:abc123@heyralli.google
DTSTART;VALUE=DATE:20251001
SUMMARY:Book Fair
END:VEVENT
END:VCALENDAR`;
    const events = parseIcsToReviewEvents(ics, null, "google");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.importSource, "google");
    assert.equal(events[0]?.importExternalId, "abc123");
  });

  it("keeps native ICS UID for ics/subscribe sources", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:school-uid-99
DTSTART;VALUE=DATE:20251001
SUMMARY:Book Fair
END:VEVENT
BEGIN:VEVENT
UID:school-uid-99
DTSTART;VALUE=DATE:20251001
SUMMARY:Book Fair
END:VEVENT
END:VCALENDAR`;
    const events = parseIcsToReviewEvents(ics, null, "subscribe");
    assert.equal(events.length, 2);
    assert.equal(events[0]?.importExternalId, "school-uid-99");
    assert.equal(events[1]?.status, "conflict");
  });
});

describe("AI fingerprint", () => {
  it("is stable for same title+date and differs when date changes", () => {
    const a = buildAiParseFingerprint("Book Fair", "2025-10-01");
    const b = buildAiParseFingerprint("book   fair", "2025-10-01");
    const c = buildAiParseFingerprint("Book Fair", "2025-10-08");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
});

describe("normalizeIcsUid", () => {
  it("strips only the Google sync suffix", () => {
    assert.equal(
      normalizeIcsUid("xyz@heyralli.google", "google"),
      "xyz",
    );
    assert.equal(
      normalizeIcsUid("xyz@heyralli.google", "ics"),
      "xyz@heyralli.google",
    );
  });
});

describe("fieldsMatchExisting", () => {
  it("compares normalized title + date", () => {
    assert.equal(
      fieldsMatchExisting(
        { name: "Book Fair", date: "2025-10-01" },
        { title: "book fair", date: "2025-10-01" },
      ),
      true,
    );
    assert.equal(
      fieldsMatchExisting(
        { name: "Book Fair", date: "2025-10-08" },
        { title: "Book Fair", date: "2025-10-01" },
      ),
      false,
    );
  });
});
