import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readSource(relativeFromThisFile: string): string {
  return readFileSync(new URL(relativeFromThisFile, import.meta.url), "utf8");
}

describe("planning lean selects", () => {
  it("event summary select omits planning JSON blobs", () => {
    const selects = readSource("../../events/selects.ts");
    assert.match(selects, /export const EVENT_SUMMARY_SELECT/);
    assert.match(selects, /\bid\b/);
    assert.match(selects, /\btitle\b/);
    assert.match(selects, /\bcommunication_strategy\b/);
    assert.doesNotMatch(selects, /planning_quick_links/);
    assert.doesNotMatch(selects, /planning_vendors/);
    assert.doesNotMatch(selects, /volunteer_needs/);
    // Lean summary stays without artwork; campaign list select adds URLs.
    const summaryStart = selects.indexOf("export const EVENT_SUMMARY_SELECT");
    const campaignListStart = selects.indexOf(
      "export const EVENT_CAMPAIGN_LIST_SELECT",
    );
    assert.ok(summaryStart >= 0);
    assert.ok(campaignListStart > summaryStart);
    const summaryBlock = selects.slice(summaryStart, campaignListStart);
    assert.doesNotMatch(summaryBlock, /approved_square_image/);
    assert.match(selects, /export const EVENT_CAMPAIGN_LIST_SELECT/);
    assert.match(selects, /approved_square_image_url/);
    assert.match(selects, /approved_square_image_status/);
  });

  it("asset select omits heavy generation / review JSON columns", () => {
    const selects = readSource("../planning-selects.ts");
    const assetBlockStart = selects.indexOf("export const PLANNING_ASSET_SELECT");
    assert.ok(assetBlockStart >= 0);
    const assetBlockEnd = selects.indexOf(
      "export const PLANNING_APPROVAL_SELECT",
      assetBlockStart,
    );
    const assetBlock = selects.slice(assetBlockStart, assetBlockEnd);
    assert.match(assetBlock, /asset_type/);
    assert.match(assetBlock, /storage_path/);
    assert.doesNotMatch(assetBlock, /"generation_prompt"/);
    assert.doesNotMatch(assetBlock, /"ai_review"/);
    assert.doesNotMatch(assetBlock, /"inspiration_match"/);
    assert.doesNotMatch(assetBlock, /"generation_settings"/);
  });

  it("version select keeps content for draft previews", () => {
    const selects = readSource("../planning-selects.ts");
    assert.match(selects, /export const PLANNING_VERSION_SELECT/);
    assert.match(selects, /content/);
    assert.match(selects, /version_number/);
  });

  it("step / item / approval / schedule / meta selects cover mapper fields", () => {
    const selects = readSource("../planning-selects.ts");
    for (const column of [
      "due_date",
      "channel",
      "is_required",
      "meta_publish_surfaces",
    ]) {
      assert.match(selects, new RegExp(column));
    }
    for (const column of [
      "event_communication_step_id",
      "is_published",
      "scheduled_for",
      "requested_at",
      "milestone_title",
      "relative_day",
      "placement",
    ]) {
      assert.match(selects, new RegExp(column));
    }
  });

  it("hot-path loaders do not use select('*')", () => {
    const planningRaw = readSource("../planning-raw.ts");
    const unifiedRaw = readSource("../unified-calendar-raw.ts");
    const calendarQueries = readSource("../queries.ts");
    const eventQueries = readSource("../../events/queries.ts");
    const intelligence = readSource("../../campaign-intelligence/queries.ts");

    assert.doesNotMatch(planningRaw, /\.select\(\s*["']\*["']\s*\)/);
    assert.doesNotMatch(unifiedRaw, /\.select\(\s*["']\*["']\s*\)/);
    assert.doesNotMatch(calendarQueries, /\.select\(\s*["']\*["']\s*\)/);
    assert.doesNotMatch(intelligence, /\.select\(\s*["']\*["']\s*\)/);

    // List helpers use EVENT_SUMMARY_SELECT; detail getEventById may stay full.
    assert.match(eventQueries, /EVENT_SUMMARY_SELECT/);
    const listHelpers = [
      "getUpcomingEvents",
      "getEventsInDateRange",
      "getEventsInNextDays",
      "getActiveEvents",
      "getAllEvents",
    ];
    for (const name of listHelpers) {
      const start = eventQueries.indexOf(`export async function ${name}`);
      assert.ok(start >= 0, `${name} missing`);
      const nextExport = eventQueries.indexOf("\nexport ", start + 1);
      const body = eventQueries.slice(
        start,
        nextExport === -1 ? undefined : nextExport,
      );
      assert.match(body, /EVENT_SUMMARY_SELECT/);
      assert.doesNotMatch(body, /\.select\(\s*["']\*["']\s*\)/);
    }

    assert.match(planningRaw, /PLANNING_EVENT_SELECT/);
    assert.match(planningRaw, /PLANNING_ASSET_SELECT/);
    assert.match(unifiedRaw, /UNIFIED_META_SLOT_SELECT/);
  });

  it("CampaignBuilderShell keeps InspirationStep as a static import (no loading flash)", () => {
    const shellPath = fileURLToPath(
      new URL(
        "../../../components/campaign-builder-v2/CampaignBuilderShell.tsx",
        import.meta.url,
      ),
    );
    const shell = readFileSync(shellPath, "utf8");
    assert.match(
      shell,
      /import\s+\{\s*InspirationStep\s*\}\s+from\s+["']@\/components\/campaign-builder-v2\/InspirationStep["']/,
    );
    assert.doesNotMatch(shell, /const InspirationStep = dynamic\(/);
  });

  it("CampaignBuilderProvider skips unchanged localStorage writes and avoids debounce double-write", () => {
    const provider = readSource(
      "../../../components/campaign-builder-v2/CampaignBuilderProvider.tsx",
    );
    assert.match(provider, /lastLocalSessionJsonByEventId/);
    assert.match(provider, /saveSessionToServer/);
    assert.match(provider, /resolveInspirationImagesForStorage/);
    assert.match(
      provider,
      /Write localStorage immediately; debounce only the server round-trip/,
    );

    const scheduleSaveStart = provider.indexOf("const scheduleSave = useCallback");
    assert.ok(scheduleSaveStart >= 0);
    const scheduleSaveEnd = provider.indexOf(
      "const flushSave = useCallback",
      scheduleSaveStart,
    );
    const scheduleSaveBody = provider.slice(scheduleSaveStart, scheduleSaveEnd);
    assert.match(scheduleSaveBody, /persistLocalSession\(next\)/);
    // Debounced server write must use the latest ref — not a stale closure.
    assert.match(scheduleSaveBody, /saveSessionToServer\(sessionRef\.current\)/);
    assert.doesNotMatch(scheduleSaveBody, /persistSession\(next\)/);
  });

  it("CampaignBuilderProvider clears non-active step UI state", () => {
    const provider = readSource(
      "../../../components/campaign-builder-v2/CampaignBuilderProvider.tsx",
    );
    assert.match(provider, /Drop step-local UI noise when leaving/);
    assert.match(provider, /setInspirationUploadError\(null\)/);
    assert.match(
      provider,
      /if \(!isGeneratingContent && generationProgress\)/,
    );
  });

  it("event workspace / playbook loaders use lean selects (no generation JSON)", () => {
    const workspaceSelects = readSource("../../event-workspace/selects.ts");
    const workspaceQueries = readSource("../../event-workspace/queries.ts");
    const playbookSelects = readSource("../../event-playbooks/selects.ts");
    const playbookQueries = readSource("../../event-playbooks/queries.ts");

    const assetStart = workspaceSelects.indexOf(
      "export const WORKSPACE_ASSET_SELECT",
    );
    const assetEnd = workspaceSelects.indexOf(
      "export const WORKSPACE_ACTIVITY_SELECT",
      assetStart,
    );
    const assetBlock = workspaceSelects.slice(assetStart, assetEnd);
    assert.match(assetBlock, /plan_label/);
    assert.doesNotMatch(assetBlock, /"generation_prompt"/);
    assert.doesNotMatch(assetBlock, /"ai_review"/);
    assert.doesNotMatch(assetBlock, /"generation_settings"/);

    assert.match(workspaceQueries, /WORKSPACE_ASSET_SELECT/);
    assert.match(workspaceQueries, /WORKSPACE_COMMUNICATION_SELECT/);
    assert.doesNotMatch(
      workspaceQueries,
      /from\("event_assets"\)\.select\(\s*["']\*["']\s*\)/,
    );

    assert.match(playbookSelects, /export const PLAYBOOK_TASK_SELECT/);
    assert.match(playbookQueries, /EVENT_SUMMARY_SELECT/);
    assert.match(playbookQueries, /PLAYBOOK_TASK_SELECT/);
    assert.doesNotMatch(
      playbookQueries,
      /from\("event_playbook_tasks"\)[\s\S]*\.select\(\s*["']\*["']\s*\)/,
    );
  });
});
