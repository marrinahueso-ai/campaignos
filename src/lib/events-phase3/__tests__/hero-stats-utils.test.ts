import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  countMilestonesFromSessionData,
  resolveHeroMilestoneCount,
} from "../hero-stats-utils.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("countMilestonesFromSessionData", () => {
  it("returns milestone array length when present", () => {
    assert.equal(
      countMilestonesFromSessionData({ milestones: [{ id: "a" }, { id: "b" }] }),
      2,
    );
  });

  it("returns 0 for an empty milestones array", () => {
    assert.equal(countMilestonesFromSessionData({ milestones: [] }), 0);
  });

  it("returns null when session data or milestones are absent", () => {
    assert.equal(countMilestonesFromSessionData(null), null);
    assert.equal(countMilestonesFromSessionData(undefined), null);
    assert.equal(countMilestonesFromSessionData({}), null);
    assert.equal(countMilestonesFromSessionData({ milestones: "nope" }), null);
  });
});

describe("resolveHeroMilestoneCount", () => {
  it("prefers session milestones when present, including zero", () => {
    assert.equal(resolveHeroMilestoneCount(4, 9), 4);
    assert.equal(resolveHeroMilestoneCount(0, 9), 0);
  });

  it("falls back to communication steps when session milestones are absent", () => {
    assert.equal(resolveHeroMilestoneCount(null, 7), 7);
    assert.equal(resolveHeroMilestoneCount(null, 0), 0);
  });
});

describe("getEventDetailHeroStats source wiring", () => {
  const heroStats = readSrc("../hero-stats.ts");

  it("reads CB2 session_data without full session sync helpers", () => {
    assert.match(heroStats, /campaign_builder_sessions/);
    assert.match(heroStats, /session_data/);
    assert.match(heroStats, /countMilestonesFromSessionData/);
    assert.match(heroStats, /resolveHeroMilestoneCount/);
    assert.doesNotMatch(heroStats, /from \"@\/lib\/campaign-builder-v2\/session-queries\"/);
    assert.doesNotMatch(heroStats, /applySchedulingRowsToSession/);
  });

  it("counts scheduled posts from approval_scheduling_items only", () => {
    assert.match(heroStats, /\.eq\("workflow_status", "scheduled"\)/);
    assert.doesNotMatch(heroStats, /meta_publication_slots/);
    assert.doesNotMatch(heroStats, /relative_day/);
  });

  it("keeps pending approvals on classic + scheduling queues", () => {
    assert.match(heroStats, /approval_requests/);
    assert.match(heroStats, /"pending"/);
    assert.match(heroStats, /"changes_requested"/);
    assert.match(heroStats, /"in_queue"/);
    assert.match(heroStats, /"assigned_to_me"/);
  });
});
