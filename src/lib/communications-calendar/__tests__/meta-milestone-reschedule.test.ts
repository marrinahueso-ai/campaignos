import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildMetaMilestoneRescheduleSlotUpdate } from "../../meta-publishing/native-schedule-utils.ts";

function readSource(relativeFromThisFile: string): string {
  return readFileSync(new URL(relativeFromThisFile, import.meta.url), "utf8");
}

describe("meta_milestone calendar DnD — no re-approval", () => {
  it("reschedule payload is schedule-only (never flips status)", () => {
    const payload = buildMetaMilestoneRescheduleSlotUpdate(
      "2026-09-10T14:00:00.000Z",
      "2026-07-21T18:00:00.000Z",
    );

    assert.equal(Object.keys(payload).sort().join(","), "scheduled_for,updated_at");
    assert.doesNotMatch(JSON.stringify(payload), /status|draft|pending|approved/);
  });

  it("planning-mutations uses schedule-only helper for meta_milestone", () => {
    const source = readSource("../planning-mutations.ts");
    const caseStart = source.indexOf('case "meta_milestone"');
    assert.ok(caseStart >= 0);
    const caseEnd = source.indexOf("default:", caseStart);
    const metaCase = source.slice(caseStart, caseEnd);

    assert.match(metaCase, /buildMetaMilestoneRescheduleSlotUpdate/);
    assert.match(metaCase, /Schedule-only: never touch status/);
    assert.match(metaCase, /syncApprovalScheduleAtForMetaMilestone/);
    assert.doesNotMatch(metaCase, /status:\s*["']draft["']/);
    assert.doesNotMatch(metaCase, /status:\s*["']scheduled["']/);
    assert.doesNotMatch(metaCase, /status:\s*["']approved["']/);
  });

  it("calendar preview prefers chip scheduledAt over Approvals schedule_at", () => {
    const source = readSource("../calendar-item-preview.ts");
    assert.match(source, /pickPreviewScheduleSource/);
    assert.match(source, /chipScheduledAt: input\.scheduledAt/);
    assert.match(
      source,
      /Calendar chip \/ Meta slot is source of truth after DnD/,
    );
  });

  it("planning-actions syncs Graph after DB success without blocking the DnD response", () => {
    const source = readSource("../planning-actions.ts");
    assert.match(source, /rescheduleNativeMetaSchedulesForMilestone/);
    assert.match(source, /after\(/);
    assert.match(source, /syncMetaScheduleInBackground/);
    // DB write returns first; Meta Graph runs in after() so DnD stays snappy.
    assert.match(source, /Return as soon as CampignOS DB is updated/);
  });

  it("records expected Meta schedule-window limits without reporting errors", () => {
    const source = readSource("../planning-actions.ts");
    const warningBlock = source.slice(
      source.indexOf("if (graphResult.warnings.length > 0)"),
      source.indexOf("} catch (error)", source.indexOf("if (graphResult.warnings.length > 0)")),
    );

    assert.match(warningBlock, /addActionBreadcrumb\("meta", message/);
    assert.doesNotMatch(warningBlock, /reportIntegrationError|captureException/);
  });
});
