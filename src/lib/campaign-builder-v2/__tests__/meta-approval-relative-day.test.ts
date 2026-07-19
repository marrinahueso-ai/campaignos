import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRelativeDayFromApprovalInputs } from "../relative-day-from-approval.ts";

describe("resolveRelativeDayFromApprovalInputs", () => {
  it("prefers user publish date over playbook title and suggestedDate", () => {
    // Announcement suggestedDate / One-Week Push = −7, but user scheduled Jul 18 (−27).
    assert.equal(
      resolveRelativeDayFromApprovalInputs({
        stepTitleMatchDay: -7,
        suggestedDate: "2026-08-07",
        feedScheduleAt: "2026-07-18T20:00:00.000Z",
        eventDate: "2026-08-14",
      }),
      -27,
    );
  });

  it("uses playbook title match when no publish time", () => {
    assert.equal(
      resolveRelativeDayFromApprovalInputs({
        stepTitleMatchDay: -14,
        suggestedDate: "2026-08-07",
        feedScheduleAt: null,
        eventDate: "2026-08-14",
      }),
      -14,
    );
  });

  it("falls back to suggestedDate when no publish time or title", () => {
    assert.equal(
      resolveRelativeDayFromApprovalInputs({
        stepTitleMatchDay: null,
        suggestedDate: "2026-08-07",
        feedScheduleAt: null,
        eventDate: "2026-08-14",
      }),
      -7,
    );
  });
});
