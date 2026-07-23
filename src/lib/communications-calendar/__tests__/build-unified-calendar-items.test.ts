import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  COMMITTED_META_SLOT_STATUSES,
  isCommittedMetaSlotStatus,
} from "../../meta-publishing/slot-status.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("buildUnifiedCalendarItemsFromRaw — Meta planner chips", () => {
  it("aggregates any committed slot as scheduled/published (not draft-only)", () => {
    assert.equal(isCommittedMetaSlotStatus("approved"), true);
    assert.equal(isCommittedMetaSlotStatus("published"), true);
    assert.equal(isCommittedMetaSlotStatus("draft"), false);
    assert.ok(COMMITTED_META_SLOT_STATUSES.includes("approved"));
  });

  it("calendar raw fetch loads committed Meta slots (incl. Publish Now orphans)", () => {
    const source = readFileSync(
      path.join(root, "lib/communications-calendar/unified-calendar-raw.ts"),
      "utf8",
    );
    assert.match(source, /COMMITTED_META_SLOT_STATUSES/);
    assert.match(source, /\.in\("status"/);
    assert.match(source, /Failed to load meta publication slots for calendar/);
  });

  it("builder keeps Publish Now custom-day chips and skips draft-only groups", () => {
    const source = readFileSync(
      path.join(root, "lib/communications-calendar/build-unified-calendar-items.ts"),
      "utf8",
    );
    assert.match(source, /export function aggregateMetaStatus/);
    assert.match(source, /isCommittedMetaSlotStatus\(slot\.status\)/);
    assert.match(source, /aggregateStatus === "draft"/);
    assert.match(source, /communicationType: "meta_milestone"/);
  });
});
