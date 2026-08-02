import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readSrc(relativeFromTest: string): string {
  return readFileSync(join(here, relativeFromTest), "utf8");
}

describe("event detail ease tenancy (source contract)", () => {
  const actions = readSrc("../actions.ts");
  const loaders = readSrc("../tab-loaders.ts");
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const phase3Client = readSrc(
    "../../../components/events-phase3/EventDetailPhase3Client.tsx",
  );
  const tasksPanel = readSrc(
    "../../../components/events-phase3/EventDetailTasksEasePanel.tsx",
  );
  const insightsPanel = readSrc(
    "../../../components/events-phase3/EventDetailInsightsEasePanel.tsx",
  );
  const approvalsPanel = readSrc(
    "../../../components/events-phase3/EventDetailApprovalsEasePanel.tsx",
  );
  const approvalsStream = readSrc(
    "../../../app/(dashboard)/events/[id]/event-detail-approvals-stream.tsx",
  );
  const eventQueries = readSrc("../../insights/event-queries.ts");
  const insightsActions = readSrc("../../insights/actions.ts");
  const tasksEaseList = readSrc(
    "../../../components/tasks-v2/TasksEaseList.tsx",
  );
  const askAi = readSrc("../../../components/tasks-v2/TasksEaseAskAi.tsx");
  const addModal = readSrc(
    "../../../components/tasks-v2/TasksEaseAddTaskModal.tsx",
  );

  it("tab load action gates with getEventById + active membership before loaders", () => {
    const fnStart = actions.indexOf(
      "export async function loadEventDetailTabAction",
    );
    assert.ok(fnStart >= 0);
    const fn = actions.slice(fnStart, fnStart + 2500);
    assert.match(fn, /getActiveMembership\(\)/);
    assert.match(fn, /getEventById\(eventId\)/);
    const membershipIdx = fn.indexOf("getActiveMembership()");
    const eventIdx = fn.indexOf("getEventById(eventId)");
    const loadIdx = fn.indexOf("loadEventDetailTabData(");
    assert.ok(membershipIdx >= 0);
    assert.ok(eventIdx > membershipIdx);
    assert.ok(loadIdx > eventIdx);
  });

  it("tasks / insights / approvals loaders stay event-scoped", () => {
    assert.match(loaders, /getTasksV2PageDataForEvent\(/);
    assert.match(loaders, /getEventInsightsPageData\(eventId\)/);
    assert.match(
      loaders,
      /getUnifiedApprovalsSchedulingDataForEvent\(\s*eventId/,
    );
    assert.doesNotMatch(
      loaders,
      /loadEventTasksTab[\s\S]*getTasksV2PageData\(\)/,
    );
  });

  it("approvals stream re-checks getEventById before querying", () => {
    const fnStart = approvalsStream.indexOf(
      "export async function EventDetailApprovalsStream",
    );
    assert.ok(fnStart >= 0);
    const fn = approvalsStream.slice(fnStart);
    assert.match(fn, /getEventById\(eventId\)/);
    const gateIdx = fn.indexOf("getEventById(eventId)");
    const loadIdx = fn.indexOf("getUnifiedApprovalsSchedulingDataForEvent(");
    assert.ok(gateIdx >= 0);
    assert.ok(loadIdx > gateIdx);
    assert.match(fn, /lockedEventId=\{event\.id\}/);
  });

  it("event Insights pin active-org school years before slot metrics", () => {
    const fnStart = eventQueries.indexOf(
      "export async function getEventInsightsPageData",
    );
    assert.ok(fnStart >= 0);
    const fn = eventQueries.slice(fnStart);
    assert.match(fn, /loadActiveOrgEventTitle/);
    assert.match(eventQueries, /getOrganizationSchoolYearIds/);
    const titleIdx = fn.indexOf("loadActiveOrgEventTitle");
    const slotsIdx = fn.indexOf("fetchPublishedSlotsForEvent");
    assert.ok(titleIdx >= 0);
    assert.ok(slotsIdx > titleIdx);
    assert.match(insightsActions, /getCurrentOrganization\(\)/);
    assert.match(
      insightsActions,
      /syncOrganizationInsights\(\{\s*organizationId: organization\.id/,
    );
  });

  it("Event Detail shell remounts per event and drops stale tab invalidates", () => {
    assert.match(phase3Client, /key=\{event\.id\}/);
    assert.match(shell, /cacheEventIdRef\.current !== requestEventId/);
    assert.match(shell, /AbortController/);
    assert.match(shell, /tabLoadAbortRef\.current\?\.abort\(\)/);
    assert.match(shell, /eventTabCacheKey\(event\.id/);
  });

  it("event Tasks panel scopes localStorage and clears optimistic state on event change", () => {
    assert.match(tasksPanel, /setTasksEaseStorageScope/);
    assert.match(tasksPanel, /organizationId: data\.organizationId/);
    assert.match(tasksPanel, /userId: data\.viewer\.userId/);
    assert.match(tasksPanel, /setOptimisticTasks\(\[\]\)/);
    assert.match(tasksPanel, /\[eventId\]/);
    assert.match(tasksPanel, /lockEventId=\{eventId\}/);
    assert.match(tasksPanel, /eventOption \? \[eventOption\] : \[\]/);
    assert.doesNotMatch(tasksPanel, /: data\.events/);
  });

  it("Ask AI / Add Task honor lockEventId for event panel creates", () => {
    assert.match(askAi, /lockEventId/);
    assert.match(askAi, /const targetEventId = lockedId \?\? eventId/);
    assert.match(askAi, /disabled=\{Boolean\(lockedId\)/);
    assert.match(addModal, /lockEventId/);
    assert.match(addModal, /const targetEventId = lockedId \?\? eventId/);
    assert.match(addModal, /createTaskHubTaskAction\(targetEventId/);
  });

  it("TasksEaseList reloads priorities per org and prunes stale overrides", () => {
    assert.match(tasksEaseList, /organizationId/);
    assert.match(
      tasksEaseList,
      /setPriorityOverrides\(loadTasksEasePriorities\(\)\)/,
    );
    assert.match(tasksEaseList, /\[organizationId, viewerUserId\]/);
    assert.match(tasksEaseList, /setOverrides\(\(current\) =>/);
    assert.match(tasksEaseList, /known\.has\(id\)/);
  });

  it("Insights carousel + Approvals drawers reset on event change", () => {
    assert.match(insightsPanel, /setSelectedIndex\(0\)/);
    assert.match(insightsPanel, /setSyncMessage\(null\)/);
    assert.match(insightsPanel, /\[data\.eventId, posts\.length\]/);
    assert.match(approvalsPanel, /setReviewItem\(null\)/);
    assert.match(approvalsPanel, /setRequestItem\(null\)/);
    assert.match(approvalsPanel, /\[lockedEventId\]/);
    assert.match(
      approvalsPanel,
      /items\.filter\(\(item\) => item\.eventId === lockedEventId\)/,
    );
  });
});
