import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;

function readSrc(relative: string): string {
  return readFileSync(join(here, relative), "utf8");
}

describe("calendar review staging contracts", () => {
  it("overnight subscribe cron stages Review instead of auto-import", () => {
    const cron = readSrc("../sync-subscribe-feed-cron.ts");
    assert.match(cron, /stageForReview:\s*true/);
    assert.doesNotMatch(cron, /autoImport:\s*true/);
  });

  it("overnight Google cron stages Review instead of auto-import", () => {
    const cron = readSrc("../../google-calendar/sync-cron.ts");
    assert.match(cron, /stageForReview:\s*true/);
    assert.doesNotMatch(cron, /autoImport:\s*true/);
  });

  it("Calendar header offers Review + Bring in calendar", () => {
    const panel = readSrc(
      "../../../components/unified-calendar/UnifiedCalendarControlPanel.tsx",
    );
    assert.match(panel, /\bReview\b/);
    assert.match(panel, /Bring in calendar/);
    assert.match(panel, /pendingReviewCount/);
    assert.match(panel, /onViewChange\("review"\)/);
  });

  it("Bring in hub keeps Google, Subscribe, and Upload methods", () => {
    const hub = readSrc(
      "../../../components/calendar-import/CalendarImportEasePanel.tsx",
    );
    assert.match(hub, /Google Calendar/);
    assert.match(hub, /Subscribe link/);
    assert.match(hub, /Upload file/);
  });

  it("Review primary action is Finish Review", () => {
    const review = readSrc(
      "../../../components/calendar-review/CalendarImportReview.tsx",
    );
    assert.match(review, /Finish Review/);
    assert.match(review, /Add Events to Calendar/);
    assert.match(review, /Use Calendar Update/);
    assert.match(review, /Use Calendar Event/);
    assert.match(review, /Keep Hey Ralli Event/);
    assert.match(review, /Keep Both/);
    assert.match(review, /Currently in Hey Ralli/);
    assert.match(review, /From your connected calendar/);
    assert.match(review, /From your calendar/);
    assert.match(review, /First Calendar Import/);
    assert.match(review, /Calendar Sync Review/);
    assert.doesNotMatch(review, /Import ready items/);
  });
});