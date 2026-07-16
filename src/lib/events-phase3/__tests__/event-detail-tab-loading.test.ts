import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  eventTabCacheKey,
  parseEventTabCacheKey,
  shouldReuseEventTabCache,
} from "../tab-cache.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("event detail tab cache keys", () => {
  it("includes eventId and tab", () => {
    const key = eventTabCacheKey("evt-a", "tasks");
    assert.equal(key, "evt-a::tasks");
    assert.deepEqual(parseEventTabCacheKey(key), {
      eventId: "evt-a",
      tab: "tasks",
    });
  });

  it("never reuses prior-event tab data", () => {
    assert.equal(shouldReuseEventTabCache("evt-a", "evt-b"), false);
    assert.equal(shouldReuseEventTabCache("evt-a", "evt-a"), true);
    assert.equal(shouldReuseEventTabCache(null, "evt-a"), false);
  });

  it("treats same event + different tabs as distinct keys", () => {
    assert.notEqual(
      eventTabCacheKey("evt-1", "approvals"),
      eventTabCacheKey("evt-1", "tasks"),
    );
  });

  it("treats same tab + different events as distinct keys", () => {
    assert.notEqual(
      eventTabCacheKey("evt-1", "files"),
      eventTabCacheKey("evt-2", "files"),
    );
  });
});

describe("event-scoped tab loaders (source contract)", () => {
  const loaders = readSrc("../tab-loaders.ts");
  const actions = readSrc("../actions.ts");
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const render = readSrc(
    "../../../app/(dashboard)/events/[id]/render-events-phase3.tsx",
  );
  const approvalsQueries = readSrc("../../approvals-scheduling/queries.ts");
  const taskHubQueries = readSrc("../../task-hub/queries.ts");
  const filesQueries = readSrc("../../campaign-files/queries.ts");
  const playbookQueries = readSrc("../../event-playbooks/queries.ts");
  const workspaceQueries = readSrc("../../event-workspace/queries.ts");
  const vendorsQueries = readSrc("../../vendors/queries.ts");

  it("approvals loader uses exact-event query helper only", () => {
    assert.match(loaders, /export async function loadEventApprovalsTab/);
    assert.match(loaders, /getUnifiedApprovalsSchedulingDataForEvent\(eventId\)/);
    assert.doesNotMatch(
      loaders,
      /getUnifiedApprovalsSchedulingData\(\)/,
    );
    assert.match(
      approvalsQueries,
      /export async function getUnifiedApprovalsSchedulingDataForEvent/,
    );
    assert.match(
      approvalsQueries,
      /\.eq\("event_id", eventId\)/,
    );
    assert.match(
      approvalsQueries,
      /getApprovalQueueOverviewForCurrentUser\(eventId\)/,
    );
    assert.doesNotMatch(
      approvalsQueries,
      /getUnifiedApprovalsSchedulingDataForEvent[\s\S]*getPlanningCalendar/,
    );
  });

  it("tasks loader uses exact-event tasks helper and skips Monday", () => {
    assert.match(loaders, /export async function loadEventTasksTab/);
    assert.match(loaders, /getTasksV2PageDataForEvent\(eventId/);
    assert.doesNotMatch(loaders, /getTasksV2PageData\(\)/);
    assert.match(taskHubQueries, /getEventPlaybookTasksForEvents\(\[eventId\]\)/);
    assert.match(taskHubQueries, /mondayBoard: null/);
  });

  it("files loader uses exact-event files helper without org event list", () => {
    assert.match(loaders, /export async function loadEventFilesTab/);
    assert.match(loaders, /getFilesPageDataForEvent\(event\)/);
    assert.doesNotMatch(loaders, /getFilesPageData\(eventId\)/);
    assert.match(
      filesQueries,
      /export async function getFilesPageDataForEvent/,
    );
    assert.match(filesQueries, /eventList: \[event\]/);
    assert.match(filesQueries, /getCampaignFilesForEvent\(event\.id\)/);
  });

  it("notes loader loads exact-event notes only", () => {
    assert.match(loaders, /export async function loadEventNotesTab/);
    assert.match(loaders, /getEventPlaybookNotesForEvent\(eventId\)/);
    assert.doesNotMatch(loaders, /getEventPlaybookHubData/);
    assert.match(
      playbookQueries,
      /\.from\("event_playbook_notes"\)[\s\S]*\.eq\("event_id", eventId\)/,
    );
  });

  it("vendors initial load excludes full directory", () => {
    assert.match(loaders, /export async function loadEventVendorsTab/);
    assert.match(loaders, /getEventVendorsData\(eventId\)/);
    assert.doesNotMatch(loaders, /getVendorDirectoryPageData/);
    assert.match(
      loaders,
      /availableVendors: \[\]/,
    );
    assert.match(vendorsQueries, /export async function getVendorDirectoryPickerData/);
    assert.match(actions, /loadEventVendorDirectoryAction/);
  });

  it("activity loader does not load full workspace or hub", () => {
    assert.match(loaders, /export async function loadEventActivityTab/);
    assert.match(loaders, /getEventPlaybookActivityForEvent\(eventId\)/);
    assert.match(loaders, /getEventActivityLogForEvent\(eventId\)/);
    assert.doesNotMatch(loaders, /getEventWorkspaceData/);
    assert.doesNotMatch(loaders, /getEventPlaybookHubData/);
    assert.match(
      workspaceQueries,
      /export async function getEventActivityLogForEvent/,
    );
    assert.match(
      workspaceQueries,
      /\.from\("activity_log"\)[\s\S]*\.eq\("event_id", eventId\)/,
    );
  });

  it("empty event tabs return without hub fan-out", () => {
    assert.match(loaders, /getEventPlaybookNotesForEvent/);
    assert.match(loaders, /getEventPlaybookActivityForEvent/);
    assert.match(loaders, /getEventActivityLogForEvent/);
    assert.doesNotMatch(loaders, /getEventPlaybookHubData/);
    assert.doesNotMatch(loaders, /getEventWorkspaceData/);
  });

  it("shared action authenticates, checks membership, and dispatches narrow loaders", () => {
    assert.match(actions, /getAuthUser\(\)/);
    assert.match(actions, /getActiveMembership\(\)/);
    assert.match(actions, /getEventById\(eventId\)/);
    assert.match(actions, /loadEventDetailTabData\(/);
    assert.match(actions, /membership\.organizationId/);
  });

  it("client cache keys by eventId + tab and resets on event change", () => {
    assert.match(shell, /eventTabCacheKey/);
    assert.match(shell, /cacheEventIdRef/);
    assert.match(shell, /tabCacheRef/);
    assert.match(shell, /Retry/);
    assert.doesNotMatch(shell, /Loading \{label\}/);
    assert.match(shell, /function TabSkeleton/);
    assert.match(shell, /deferDirectoryLoad/);
  });

  it("SSR deep links preload only the selected event-scoped tab", () => {
    assert.match(render, /loadEventDetailTabData\(/);
    assert.match(render, /lazyInitial/);
    assert.doesNotMatch(render, /getUnifiedApprovalsSchedulingData\(\)/);
    assert.doesNotMatch(render, /getTasksV2PageData\(\)/);
    assert.doesNotMatch(render, /getEventPlaybookHubData/);
    assert.doesNotMatch(render, /getVendorDirectoryPageData/);
  });

  it("does not alter create/edit vendor mutation action wiring", () => {
    const vendorsSection = readSrc(
      "../../../components/vendors/EventVendorsSection.tsx",
    );
    assert.match(vendorsSection, /assignVendorToEventAction/);
    assert.match(vendorsSection, /removeVendorFromEventAction/);
    assert.match(vendorsSection, /uploadVendorLogoAction/);
    assert.match(vendorsSection, /VendorAddModal/);
  });
});

describe("in-session tab cache behavior", () => {
  it("switching back to a loaded tab is instant via cache hit", () => {
    const cache = new Map<string, { tab: string }>();
    const eventId = "evt-1";
    cache.set(eventTabCacheKey(eventId, "notes"), { tab: "notes" });

    const hit = cache.get(eventTabCacheKey(eventId, "notes"));
    assert.ok(hit);
    assert.equal(hit.tab, "notes");
  });

  it("switching events never reuses prior-event tab data", () => {
    const cache = new Map<string, { tab: string; eventId: string }>();
    cache.set(eventTabCacheKey("evt-1", "tasks"), {
      tab: "tasks",
      eventId: "evt-1",
    });

    assert.equal(
      cache.get(eventTabCacheKey("evt-2", "tasks")),
      undefined,
    );
    assert.equal(shouldReuseEventTabCache("evt-1", "evt-2"), false);
  });
});
