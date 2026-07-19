import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("targeted event tab speed contracts", () => {
  const taskHub = readSrc("../../task-hub/queries.ts");
  const approvals = readSrc("../../approvals-scheduling/queries.ts");
  const routing = readSrc("../../event-workspace/approval-routing-queries.ts");
  const actions = readSrc("../actions.ts");
  const loaders = readSrc("../tab-loaders.ts");
  const vendors = readSrc("../../vendors/queries.ts");
  const tasksShell = readSrc("../../../components/tasks-v2/TasksV2Shell.tsx");
  const approvalsHub = readSrc(
    "../../../components/approvals-scheduling/ApprovalsSchedulingHub.tsx",
  );
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );

  it("tasks event loader skips org workspace and org users", () => {
    const start = taskHub.indexOf(
      "export async function getTaskHubPageDataForEvent",
    );
    const body = taskHub.slice(start, start + 4500);
    assert.match(body, /getEventPlaybookTasksForEvents\(\[eventId\]\)/);
    assert.doesNotMatch(body, /getOrganizationWorkspaceData/);
    assert.doesNotMatch(body, /getOrganizationUsers/);
    assert.doesNotMatch(body, /groupTasksByCommittee/);
    assert.match(body, /mondayBoard: null/);
  });

  it("approvals skips Meta when scheduling rows already have display preview", () => {
    assert.match(approvals, /schedulingRowHasDisplayPreview/);
    assert.match(approvals, /classicQueueNeedsPreviewEnrichment/);
    assert.match(approvals, /resolveApprovalQueueBaseForEvent/);
    // Lean list omits captions; Meta skip is artwork-URL based.
    assert.match(
      approvals,
      /needsMetaPreview = schedulingRows\.some\(\s*\(row\) => !row\.feed_artwork_url && !row\.story_artwork_url/,
    );
  });

  it("approvals enrichment remains available for missing previews", () => {
    assert.match(routing, /enrichPreviews\?: boolean/);
    assert.match(routing, /enrichApprovalQueuePreviewsForItems/);
    assert.match(approvals, /enrichApprovalQueuePreviewsForItems/);
  });

  it("tab action resolves auth context once and reuses it", () => {
    assert.match(actions, /EventDetailTabContext/);
    assert.match(actions, /loadEventDetailTabData\(\s*tab as EventDetailLazyTab,\s*context/);
    assert.match(loaders, /context: EventDetailTabContext/);
    assert.match(loaders, /campaignRole: context\.campaignRole/);
    assert.match(loaders, /tablesAvailable: context\.tablesAvailable/);
  });

  it("embedded hubs hide org-wide chrome", () => {
    assert.match(tasksShell, /!embedded \? \(\s*<div className="w-full lg:max-w-md/);
    assert.match(approvalsHub, /canViewAll && !embedded/);
    assert.match(approvalsHub, /!embedded \? <SummaryCards/);
  });

  it("vendor logos use batched signed URLs", () => {
    assert.match(vendors, /createSignedUrls\(/);
    assert.match(vendors, /export const areVendorTablesAvailable = cache/);
  });

  it("warms Approvals and Tasks JS chunks without prefetching data", () => {
    assert.match(shell, /requestIdleCallback/);
    assert.match(
      shell,
      /import\("@\/components\/approvals-scheduling\/ApprovalsSchedulingHub"\)/,
    );
    assert.match(shell, /import\("@\/components\/tasks-v2\/TasksV2Shell"\)/);
    assert.doesNotMatch(
      shell,
      /requestIdleCallback[\s\S]*loadEventDetailTabAction/,
    );
  });

  it("Create with AI tab navigates to the builder route without embedding it", () => {
    assert.match(shell, /window\.location\.assign\(createWithAiUrl\)/);
    assert.match(shell, /prefetch=\{false\}/);
    assert.doesNotMatch(shell, /CampaignBuilderProvider/);
    assert.doesNotMatch(shell, /CampaignBuilderShell/);
    assert.doesNotMatch(shell, /loadCampaignBuilderSession/);
    assert.doesNotMatch(shell, /Continue to Create with AI/);
  });

  it("keeps standalone hub loaders on org-wide paths", () => {
    assert.match(taskHub, /export async function getTaskHubPageData\(/);
    assert.match(taskHub, /getOrganizationWorkspaceData\(organization\.id\)/);
    assert.match(
      approvals,
      /export async function getUnifiedApprovalsSchedulingData\(/,
    );
    assert.match(approvals, /getPlanningCalendarData\(\)/);
  });
});
