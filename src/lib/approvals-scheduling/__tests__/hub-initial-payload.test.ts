import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  APPROVALS_HUB_DEFERRED_WORKFLOW_STATUSES,
  APPROVALS_HUB_INITIAL_WORKFLOW_STATUSES,
} from "../constants.ts";
import {
  campaignsFromStatusIndex,
  computePulseCountsFromStatusIndex,
  summarizeStatusIndex,
} from "../hub-initial-payload.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("approvals hub initial payload deferral", () => {
  it("initial statuses are actionable + failed only", () => {
    assert.deepEqual([...APPROVALS_HUB_INITIAL_WORKFLOW_STATUSES], [
      "in_queue",
      "assigned_to_me",
      "changes_requested",
      "failed",
    ]);
    assert.deepEqual([...APPROVALS_HUB_DEFERRED_WORKFLOW_STATUSES], [
      "scheduled",
      "posted",
      "published",
    ]);
  });

  it("thin status index keeps Scheduled/Posted pulse counts without detail rows", () => {
    const rows = [
      {
        id: "1",
        event_id: "e1",
        campaign_name: "Gala",
        workflow_status: "assigned_to_me" as const,
        delivery_method: "schedule",
      },
      {
        id: "2",
        event_id: "e1",
        campaign_name: "Gala",
        workflow_status: "scheduled" as const,
        delivery_method: "schedule",
      },
      {
        id: "3",
        event_id: "e1",
        campaign_name: "Gala",
        workflow_status: "posted" as const,
        delivery_method: "schedule",
      },
      {
        id: "4",
        event_id: "e2",
        campaign_name: "Auction",
        workflow_status: "published" as const,
        delivery_method: "publish-now",
      },
      {
        id: "5",
        event_id: "e2",
        campaign_name: "Auction",
        workflow_status: "scheduled" as const,
        delivery_method: "draft-only",
      },
    ];

    const pulse = computePulseCountsFromStatusIndex(rows);
    assert.equal(pulse.needs, 1);
    assert.equal(pulse.scheduled, 1);
    assert.equal(pulse.posted, 2);
    assert.equal(pulse.failed, 0);
    assert.equal(pulse.changes, 0);

    const summary = summarizeStatusIndex(rows);
    assert.equal(summary.scheduled, 2);
    assert.equal(summary.posted, 1);
    assert.equal(summary.published, 1);

    const campaigns = campaignsFromStatusIndex(rows);
    assert.deepEqual(
      campaigns.map((c) => c.id).sort(),
      ["e1", "e2"],
    );
  });

  it("org hub SSR defers terminal detail and uses server pulseCounts", () => {
    const queries = readSrc("../queries.ts");
    const hub = readSrc(
      "../../../components/approvals-scheduling/ApprovalsSchedulingHub.tsx",
    );
    const actions = readSrc("../actions.ts");
    const revision = readSrc(
      "../../../app/(dashboard)/approvals/revision/page.tsx",
    );

    assert.match(
      queries,
      /deferTerminalDetailRows:\s*true/,
    );
    assert.match(queries, /getUnifiedApprovalsDeferredPulseItems/);
    assert.match(queries, /getUnifiedApprovalsSchedulingDataComplete/);
    assert.match(hub, /loadApprovalsDeferredPulseItemsAction/);
    assert.match(hub, /pulseCounts:\s*initialPulseCounts/);
    assert.match(hub, /defersTerminalDetailRows/);
    assert.doesNotMatch(hub, /computeApprovalsEasePulseCounts\(/);
    assert.match(actions, /loadApprovalsDeferredPulseItemsAction/);
    assert.match(revision, /getUnifiedApprovalsSchedulingDataComplete/);
  });

  it("event-scoped approvals keep full detail rows", () => {
    const queries = readSrc("../queries.ts");
    const fnStart = queries.indexOf(
      "export async function getUnifiedApprovalsSchedulingDataForEvent",
    );
    assert.ok(fnStart >= 0);
    const fnBody = queries.slice(fnStart);
    assert.match(fnBody, /defersTerminalDetailRows:\s*false/);
    assert.match(fnBody, /computeApprovalsEasePulseCounts\(items\)/);
    assert.doesNotMatch(fnBody, /deferTerminalDetailRows:\s*true/);
  });
});
