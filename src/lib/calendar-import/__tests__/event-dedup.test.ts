import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildAiParseFingerprint,
  buildIncomingUpdateSnapshot,
  calendarEventDedupeKey,
  classifyReviewEventsAgainstExisting,
  fieldsMatchExisting,
  markWithinFileConflicts,
  partitionClassifiedReviewEvents,
} from "../event-dedup.ts";
import { applySyncReviewDecision } from "../sync-review-decisions.ts";
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
    time: overrides.time,
    location: overrides.location,
    existingEventId: overrides.existingEventId ?? null,
    existingEventName: overrides.existingEventName ?? null,
    existingEventDate: overrides.existingEventDate ?? null,
    existingEventTime: overrides.existingEventTime ?? null,
    existingEventLocation: overrides.existingEventLocation ?? null,
    matchReason: overrides.matchReason ?? null,
    applyUpdate: overrides.applyUpdate,
    keepBothFromEventId: overrides.keepBothFromEventId,
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
    assert.equal(classified[0]?.existingEventName, "Book Fair");
    assert.equal(classified[0]?.existingEventDate, "2025-10-01");
    assert.match(classified[0]?.matchReason ?? "", /2025-10-01 → 2025-10-08/);
  });

  it("updates, rather than inserts, when an external event changes title casing", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "2nd Grade Music Program",
          date: "2026-11-11",
          importSource: "subscribe",
          importExternalId: "music-program-uid",
        }),
      ],
      [
        {
          id: "evt-music",
          title: "2nd grade music program",
          date: "2026-11-11",
          importSource: "subscribe",
          importExternalId: "music-program-uid",
        },
      ],
    );
    const partitioned = partitionClassifiedReviewEvents(classified);

    assert.equal(classified[0]?.status, "update");
    assert.equal(classified[0]?.existingEventId, "evt-music");
    assert.equal(partitioned.toUpdate.length, 1);
    assert.equal(partitioned.toInsert.length, 0);
  });

  it("skips title+date match when there is no external id", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [reviewEvent({ name: "Spirit Night", date: "2025-11-05" })],
      [{ id: "evt-2", title: "Spirit Night", date: "2025-11-05" }],
    );
    assert.equal(classified[0]?.status, "duplicate");
  });

  it("uses normalized title+date fallback when an ICS UID is missing", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [reviewEvent({ name: "2ND GRADE MUSIC PROGRAM", date: "2026-11-11" })],
      [{
        id: "evt-music",
        title: "2nd grade music program",
        date: "2026-11-11",
      }],
    );

    assert.equal(classified[0]?.status, "duplicate");
    assert.equal(classified[0]?.existingEventId, "evt-music");
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

  it("marks update when same external id has a time-only change", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-01",
          time: "16:00:00",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          time: "15:00:00",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
        },
      ],
    );
    assert.equal(classified[0]?.status, "update");
    assert.match(classified[0]?.matchReason ?? "", /time changed/);
    assert.equal(classified[0]?.existingEventTime, "15:00:00");
  });

  it("marks update when same external id has a location-only change", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-01",
          location: "Cafeteria",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          location: "Library",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
        },
      ],
    );
    assert.equal(classified[0]?.status, "update");
    assert.match(classified[0]?.matchReason ?? "", /location changed/);
    assert.equal(classified[0]?.existingEventLocation, "Library");
  });

  it("still skips when time and location are unchanged", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Book Fair",
          date: "2025-10-01",
          time: "15:00:00",
          location: "Library",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
        }),
      ],
      [
        {
          id: "evt-1",
          title: "Book Fair",
          date: "2025-10-01",
          time: "15:00",
          location: "Library",
          importSource: "subscribe",
          importExternalId: "uid-book-fair",
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

  it("captures time from timed DTSTART and location from LOCATION", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:timed-event@example.com
DTSTART:20261015T183000Z
SUMMARY:Evening Concert
LOCATION:Main Gym
END:VEVENT
END:VCALENDAR`;
    const events = parseIcsToReviewEvents(ics, null, "subscribe");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.time, "18:30:00");
    assert.equal(events[0]?.location, "Main Gym");
  });

  it("treats midnight DTSTART as all-day (no clock time)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:midnight-allday@example.com
DTSTART:20261015T000000
SUMMARY:2nd grade music program
END:VEVENT
END:VCALENDAR`;
    const events = parseIcsToReviewEvents(ics, null, "subscribe");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.time, null);
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

describe("change resolution refresh / idempotency", () => {
  const existing = {
    id: "evt-1",
    title: "Family Picnic",
    date: "2026-09-18",
    time: "16:00:00",
    location: "Gym",
    importSource: "subscribe",
    importExternalId: "uid-picnic",
  };

  const incoming = reviewEvent({
    name: "Fall Picnic",
    date: "2026-09-25",
    time: "17:00:00",
    location: "Field",
    importSource: "subscribe",
    importExternalId: "uid-picnic",
  });

  it("stages a multi-field source change as a single update", () => {
    const classified = classifyReviewEventsAgainstExisting([incoming], [
      existing,
    ]);
    const partitioned = partitionClassifiedReviewEvents(classified);
    assert.equal(classified[0]?.status, "update");
    assert.equal(classified[0]?.existingEventId, "evt-1");
    assert.equal(partitioned.toUpdate.length, 1);
    assert.equal(partitioned.toInsert.length, 0);
    assert.match(classified[0]?.matchReason ?? "", /title changed/);
    assert.match(classified[0]?.matchReason ?? "", /time changed/);
    assert.match(classified[0]?.matchReason ?? "", /location changed/);
  });

  it("after Update (fields aligned) a refresh is a no-op duplicate", () => {
    const classified = classifyReviewEventsAgainstExisting(
      [
        reviewEvent({
          name: "Fall Picnic",
          date: "2026-09-25",
          time: "17:00:00",
          location: "Field",
          importSource: "subscribe",
          importExternalId: "uid-picnic",
        }),
      ],
      [
        {
          ...existing,
          title: "Fall Picnic",
          date: "2026-09-25",
          time: "17:00:00",
          location: "Field",
          importDismissedSnapshot: null,
        },
      ],
    );
    const partitioned = partitionClassifiedReviewEvents(classified);
    assert.equal(classified[0]?.status, "duplicate");
    assert.equal(partitioned.toUpdate.length, 0);
    assert.equal(partitioned.toInsert.length, 0);
    assert.equal(partitioned.skippedDuplicates.length, 1);
  });

  it("after Keep Mine, the exact dismissed snapshot does not reappear", () => {
    const snapshot = buildIncomingUpdateSnapshot(incoming);
    const classified = classifyReviewEventsAgainstExisting([incoming], [
      { ...existing, importDismissedSnapshot: snapshot },
    ]);
    const partitioned = partitionClassifiedReviewEvents(classified);
    assert.equal(classified[0]?.status, "duplicate");
    assert.match(classified[0]?.matchReason ?? "", /already dismissed/i);
    assert.equal(partitioned.toUpdate.length, 0);
    assert.equal(partitioned.toInsert.length, 0);
  });

  it("Keep Mine reappears when the source changes again", () => {
    const snapshot = buildIncomingUpdateSnapshot(incoming);
    const newer = reviewEvent({
      ...incoming,
      time: "18:00:00",
    });
    const classified = classifyReviewEventsAgainstExisting([newer], [
      { ...existing, importDismissedSnapshot: snapshot },
    ]);
    assert.equal(classified[0]?.status, "update");
  });

  it("Keep Both inserts once and dismisses rematch on refresh", () => {
    const decided = applySyncReviewDecision(
      {
        ...incoming,
        status: "update",
        existingEventId: "evt-1",
        existingEventName: existing.title,
        existingEventDate: existing.date,
        existingEventTime: existing.time,
        existingEventLocation: existing.location,
      },
      "keep_both",
    );
    assert.equal(decided.keepBothFromEventId, "evt-1");
    assert.equal(decided.importExternalId, null);

    const finishClassified = classifyReviewEventsAgainstExisting(
      [decided],
      [existing],
    );
    const partitioned = partitionClassifiedReviewEvents(finishClassified);
    assert.equal(finishClassified[0]?.status, "ready");
    assert.equal(partitioned.toInsert.length, 1);
    assert.equal(partitioned.toUpdate.length, 0);
    assert.equal(finishClassified[0]?.importExternalId, null);

    const snapshot = buildIncomingUpdateSnapshot(incoming);
    const refresh = classifyReviewEventsAgainstExisting([incoming], [
      { ...existing, importDismissedSnapshot: snapshot },
    ]);
    const refreshPartition = partitionClassifiedReviewEvents(refresh);
    assert.equal(refresh[0]?.status, "duplicate");
    assert.equal(refreshPartition.toInsert.length, 0);
    assert.equal(refreshPartition.toUpdate.length, 0);
  });

  it("preserves source mapping on the existing event for Update classification", () => {
    const classified = classifyReviewEventsAgainstExisting([incoming], [
      existing,
    ]);
    assert.equal(classified[0]?.existingEventId, "evt-1");
    assert.equal(classified[0]?.importExternalId, "uid-picnic");
    assert.equal(classified[0]?.importSource, "subscribe");
  });

  it("does not match another org/school-year event when external index is scoped", () => {
    // Callers load existing rows per school_year_id; an out-of-scope event is
    // simply absent from `existing`, so classify cannot update it.
    const classified = classifyReviewEventsAgainstExisting([incoming], []);
    assert.equal(classified[0]?.status, "ready");
    assert.equal(classified[0]?.existingEventId, null);
  });
});
