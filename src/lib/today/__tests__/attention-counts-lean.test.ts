import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../attention-counts.ts", import.meta.url),
  "utf8",
);

describe("Attention counts stay lean for default dashboard", () => {
  it("does not materialize getDashboardRichListData for counts", () => {
    assert.doesNotMatch(source, /getDashboardRichListData/);
  });

  it("uses sidebar approval + scheduling badge counts for reviewCount", () => {
    assert.match(source, /getApprovalSidebarCountsForCurrentUser/);
    assert.match(source, /getSidebarSchedulingBadgeCounts/);
    assert.match(source, /Math\.max\(/);
  });

  it("short-circuits volunteers when no event_volunteer_sources exist", () => {
    assert.match(source, /event_volunteer_sources/);
    assert.match(source, /count: "exact", head: true/);
    assert.match(source, /getVolunteersMasterPageData/);
  });

  it("short-circuits tasks when no event_playbook_tasks exist", () => {
    assert.match(source, /event_playbook_tasks/);
    assert.match(source, /getDashboardTaskItems/);
    assert.match(source, /filterTasksForMyView/);
  });
});
