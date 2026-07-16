import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  eventTabCacheHas,
  eventTabCacheKey,
  invalidateEventTabCacheEntry,
  listEventTabCacheKeys,
  tabAffectsHeroStats,
} from "../tab-cache.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("invalidateEventTabCacheEntry", () => {
  it("removes only the affected eventId::tab entry", () => {
    const cache = new Map<string, { tab: string }>([
      [eventTabCacheKey("evt-a", "approvals"), { tab: "approvals" }],
      [eventTabCacheKey("evt-a", "tasks"), { tab: "tasks" }],
      [eventTabCacheKey("evt-b", "approvals"), { tab: "approvals" }],
      [eventTabCacheKey("evt-a", "vendors"), { tab: "vendors" }],
    ]);

    assert.equal(
      invalidateEventTabCacheEntry(cache, "evt-a", "approvals"),
      true,
    );
    assert.equal(eventTabCacheHas(cache, "evt-a", "approvals"), false);
    assert.equal(eventTabCacheHas(cache, "evt-a", "tasks"), true);
    assert.equal(eventTabCacheHas(cache, "evt-a", "vendors"), true);
    assert.equal(eventTabCacheHas(cache, "evt-b", "approvals"), true);
    assert.deepEqual(listEventTabCacheKeys(cache), [
      "evt-a::tasks",
      "evt-a::vendors",
      "evt-b::approvals",
    ]);
  });

  it("Event A mutation does not affect Event B cache", () => {
    const cache = new Map<string, number>([
      [eventTabCacheKey("evt-a", "tasks"), 1],
      [eventTabCacheKey("evt-b", "tasks"), 2],
    ]);
    invalidateEventTabCacheEntry(cache, "evt-a", "tasks");
    assert.equal(cache.get(eventTabCacheKey("evt-b", "tasks")), 2);
  });

  it("unrelated tab caches remain intact", () => {
    const cache = new Map<string, string>([
      [eventTabCacheKey("evt-1", "tasks"), "tasks"],
      [eventTabCacheKey("evt-1", "notes"), "notes"],
      [eventTabCacheKey("evt-1", "files"), "files"],
    ]);
    invalidateEventTabCacheEntry(cache, "evt-1", "tasks");
    assert.deepEqual(listEventTabCacheKeys(cache), [
      "evt-1::files",
      "evt-1::notes",
    ]);
  });

  it("marks approvals/tasks/files as hero-stat refresh tabs", () => {
    assert.equal(tabAffectsHeroStats("approvals"), true);
    assert.equal(tabAffectsHeroStats("tasks"), true);
    assert.equal(tabAffectsHeroStats("files"), true);
    assert.equal(tabAffectsHeroStats("vendors"), false);
    assert.equal(tabAffectsHeroStats("notes"), false);
  });
});

describe("mutation refresh wiring (source contract)", () => {
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const invalidation = readSrc(
    "../../../components/events-phase3/EventDetailTabInvalidation.tsx",
  );
  const approvalsHub = readSrc(
    "../../../components/approvals-scheduling/ApprovalsSchedulingHub.tsx",
  );
  const approvalsTable = readSrc(
    "../../../components/approvals-scheduling/ApprovalsTable.tsx",
  );
  const tasksGroup = readSrc("../../../components/tasks-v2/TasksV2EventGroup.tsx");
  const tasksSidebar = readSrc("../../../components/tasks-v2/TasksV2Sidebar.tsx");
  const vendors = readSrc(
    "../../../components/vendors/EventVendorsSection.tsx",
  );
  const actions = readSrc("../actions.ts");

  it("shell exposes invalidateEventTab and keeps content during refresh", () => {
    assert.match(shell, /invalidateEventTab/);
    assert.match(shell, /EventDetailTabInvalidationProvider/);
    assert.match(shell, /Updating…/);
    assert.match(shell, /Saved, but this tab could not refresh/);
    assert.match(shell, /refreshEventDetailHeroStatsAction/);
    assert.match(shell, /invalidateEventTabCacheEntry/);
  });

  it("hook falls back to router.refresh outside Event Detail", () => {
    assert.match(invalidation, /useEventTabMutationRefresh/);
    assert.match(invalidation, /router\.refresh\(\)/);
    assert.match(invalidation, /ctx\.invalidateEventTab\(tab\)/);
  });

  it("Approvals approve and request-changes refresh the approvals tab", () => {
    assert.match(approvalsHub, /useEventTabMutationRefresh\("approvals"\)/);
    assert.match(approvalsHub, /await refreshApprovalsTab\(\)/);
    assert.match(approvalsTable, /useEventTabMutationRefresh\("approvals"\)/);
    assert.match(approvalsTable, /await refreshApprovalsTab\(\)/);
    assert.doesNotMatch(approvalsHub, /router\.refresh\(\)/);
    assert.doesNotMatch(approvalsTable, /router\.refresh\(\)/);
  });

  it("Tasks create/complete/reorder/add-generated refresh the tasks tab", () => {
    assert.match(tasksGroup, /useEventTabMutationRefresh\("tasks"\)/);
    assert.match(tasksGroup, /await refreshTasksTab\(\)/);
    assert.match(tasksSidebar, /useEventTabMutationRefresh\("tasks"\)/);
    assert.match(tasksSidebar, /await refreshTasksTab\(\)/);
    assert.doesNotMatch(tasksGroup, /router\.refresh\(\)/);
    assert.doesNotMatch(tasksSidebar, /router\.refresh\(\)/);
  });

  it("Vendors add/remove/logo/create refresh the vendors tab", () => {
    assert.match(vendors, /useEventTabMutationRefresh\("vendors"\)/);
    assert.match(vendors, /await refreshVendorsTab\(\)/);
    assert.match(vendors, /void refreshVendorsTab\(\)/);
    assert.doesNotMatch(vendors, /router\.refresh\(\)/);
  });

  it("hero stats refresh action is available", () => {
    assert.match(actions, /refreshEventDetailHeroStatsAction/);
    assert.match(actions, /getEventDetailHeroStats\(eventId\)/);
  });

  it("failed refetch remains retryable in shell UI", () => {
    assert.match(shell, /onClick=\{\(\) => \{\s*void invalidateEventTab\(tab/);
    assert.match(shell, /Retry/);
  });
});
