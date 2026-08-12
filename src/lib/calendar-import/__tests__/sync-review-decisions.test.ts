import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySyncReviewDecision,
  buildSyncReviewSummaryCopy,
  getSyncReviewChangeDiffs,
  partitionFirstImportSections,
  partitionSyncReviewSections,
  resolveCalendarReviewMode,
} from "../sync-review-decisions.ts";
import type { CalendarReviewEvent } from "../../../types/calendar-review.ts";

function event(
  overrides: Partial<CalendarReviewEvent> &
    Pick<CalendarReviewEvent, "name" | "date" | "status">,
): CalendarReviewEvent {
  return {
    id: overrides.id ?? overrides.name,
    name: overrides.name,
    date: overrides.date,
    category: overrides.category ?? "School Event",
    status: overrides.status,
    communicationStrategy: "calendar_only",
    existingEventId: overrides.existingEventId ?? null,
    existingEventName: overrides.existingEventName ?? null,
    existingEventDate: overrides.existingEventDate ?? null,
    matchReason: overrides.matchReason ?? null,
    applyUpdate: overrides.applyUpdate,
  };
}

describe("partitionSyncReviewSections", () => {
  it("splits new, changed, needs attention, and duplicates", () => {
    const sections = partitionSyncReviewSections([
      event({ name: "New Fair", date: "2026-10-01", status: "ready" }),
      event({
        name: "Picnic",
        date: "2026-09-25",
        status: "update",
        existingEventId: "e1",
        existingEventName: "Picnic",
        existingEventDate: "2026-09-18",
      }),
      event({ name: "Ambiguous", date: "2026-11-01", status: "needs_review" }),
      event({ name: "Dup", date: "2026-12-01", status: "duplicate" }),
      event({ name: "Conflict", date: "2026-12-02", status: "conflict" }),
    ]);

    assert.equal(sections.newlyAdded.length, 1);
    assert.equal(sections.changes.length, 1);
    assert.equal(sections.needsAttention.length, 2);
    assert.equal(sections.alreadyOnCalendar.length, 1);
  });
});

describe("applySyncReviewDecision", () => {
  it("maps Use Calendar Update on update to applyUpdate true", () => {
    const next = applySyncReviewDecision(
      event({
        name: "Picnic",
        date: "2026-09-25",
        status: "update",
        existingEventId: "e1",
        applyUpdate: false,
      }),
      "use_calendar_update",
    );
    assert.equal(next.status, "update");
    assert.equal(next.applyUpdate, true);
  });

  it("maps Keep Hey Ralli on update to skip", () => {
    const next = applySyncReviewDecision(
      event({
        name: "Picnic",
        date: "2026-09-25",
        status: "update",
        existingEventId: "e1",
      }),
      "keep_hey_ralli",
    );
    assert.equal(next.status, "update");
    assert.equal(next.applyUpdate, false);
  });

  it("maps Keep Both to a new ready row", () => {
    const next = applySyncReviewDecision(
      event({
        name: "Picnic",
        date: "2026-09-25",
        status: "update",
        existingEventId: "e1",
        existingEventName: "Picnic",
        existingEventDate: "2026-09-18",
      }),
      "keep_both",
    );
    assert.equal(next.status, "ready");
    assert.equal(next.existingEventId, null);
    assert.equal(next.applyUpdate, false);
  });

  it("maps Use Calendar Update on conflict to ready", () => {
    const next = applySyncReviewDecision(
      event({ name: "Dup Row", date: "2026-10-01", status: "conflict" }),
      "use_calendar_update",
    );
    assert.equal(next.status, "ready");
  });
});

describe("getSyncReviewChangeDiffs", () => {
  it("returns title and date diffs against the Hey Ralli event", () => {
    const diffs = getSyncReviewChangeDiffs(
      event({
        name: "Fall Picnic",
        date: "2026-09-25",
        status: "update",
        existingEventName: "Family Picnic",
        existingEventDate: "2026-09-18",
      }),
    );
    assert.equal(diffs.length, 2);
    assert.equal(diffs[0]?.label, "Title");
    assert.equal(diffs[1]?.label, "Date");
  });
});

describe("buildSyncReviewSummaryCopy", () => {
  it("mentions needs-review count when attention remains", () => {
    const copy = buildSyncReviewSummaryCopy({
      needsAttention: [
        event({ name: "A", date: "2026-01-01", status: "conflict" }),
      ],
      changes: [],
      newlyAdded: [
        event({ name: "B", date: "2026-01-02", status: "ready" }),
      ],
      alreadyOnCalendar: [],
      skippedUpdates: [],
    });
    assert.match(copy, /1 thing that needs a quick look/i);
  });
});

describe("resolveCalendarReviewMode", () => {
  it("uses first_import when there is no prior import and no updates", () => {
    assert.equal(
      resolveCalendarReviewMode(
        [event({ name: "Fair", date: "2026-10-01", status: "ready" })],
        { hasPriorImportedCalendar: false },
      ),
      "first_import",
    );
  });

  it("uses sync when the org already imported a calendar", () => {
    assert.equal(
      resolveCalendarReviewMode(
        [event({ name: "Fair", date: "2026-10-01", status: "ready" })],
        { hasPriorImportedCalendar: true },
      ),
      "sync",
    );
  });

  it("uses sync when the batch includes update rows", () => {
    assert.equal(
      resolveCalendarReviewMode(
        [
          event({
            name: "Fair",
            date: "2026-10-08",
            status: "update",
            existingEventId: "e1",
          }),
        ],
        { hasPriorImportedCalendar: false },
      ),
      "sync",
    );
  });
});

describe("partitionFirstImportSections", () => {
  it("puts matched duplicates into needs attention and ready rows into readyToAdd", () => {
    const sections = partitionFirstImportSections([
      event({ name: "Ready", date: "2026-10-01", status: "ready" }),
      event({
        name: "Dup",
        date: "2026-10-02",
        status: "duplicate",
        existingEventId: "e1",
      }),
      event({ name: "Conflict", date: "2026-10-03", status: "conflict" }),
    ]);
    assert.equal(sections.readyToAdd.length, 1);
    assert.equal(sections.needsAttention.length, 2);
  });
});
