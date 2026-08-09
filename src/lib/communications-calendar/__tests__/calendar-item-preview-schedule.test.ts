import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPreviewScheduleSource } from "../calendar-item-preview-schedule.ts";

describe("pickPreviewScheduleSource", () => {
  it("prefers calendar chip time over stale Approvals schedule_at", () => {
    assert.equal(
      pickPreviewScheduleSource({
        chipScheduledAt: "2026-08-12T14:00:00.000Z",
        approvalScheduleAt: "2026-08-11T14:00:00.000Z",
      }),
      "2026-08-12T14:00:00.000Z",
    );
  });

  it("falls back to Approvals schedule_at when chip has no time", () => {
    assert.equal(
      pickPreviewScheduleSource({
        chipScheduledAt: null,
        approvalScheduleAt: "2026-08-11T14:00:00.000Z",
      }),
      "2026-08-11T14:00:00.000Z",
    );
  });

  it("prefers chip over Meta bundle scheduledFor", () => {
    assert.equal(
      pickPreviewScheduleSource({
        chipScheduledAt: "2026-08-12T14:00:00.000Z",
        bundleScheduledFor: "2026-08-11T14:00:00.000Z",
      }),
      "2026-08-12T14:00:00.000Z",
    );
  });

  it("returns null when no schedule sources exist", () => {
    assert.equal(
      pickPreviewScheduleSource({
        chipScheduledAt: null,
        approvalScheduleAt: null,
        bundleScheduledFor: null,
      }),
      null,
    );
  });
});
