import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

/**
 * Phase 4 — the Meta approval backfill triggered from the Approvals page
 * previously ran fully unscoped: `dedupePendingApprovalRequestsInDb`,
 * `resolveStalePendingApprovalRequestsForApprovedItems`, and the
 * `meta_publication_slots` sweep inside `backfillMetaApprovalRequests` had
 * no `event_id`/organization filter at all, so a single organization's
 * `/approvals` page load reconciled every event visible to that Supabase
 * session — and did so on every page load, with per-event work that grew
 * with total system-wide (not per-org) pending state. Production traces
 * showed background calls lasting 16s–626s from this path.
 *
 * These tests pin the fix: an explicit, bounded `eventIds` scope threads
 * through every layer, an empty scope is a cheap no-op, the daily cron
 * sweep keeps its original unscoped (`null`) behavior, and the interactive
 * Approvals page now resolves+passes its own organization's event ids
 * instead of ever calling the unscoped entry point.
 */

describe("approval-request-dedupe — organization/event scoping", () => {
  const source = readSrc("lib/event-workspace/approval-request-dedupe.ts");

  it("dedupePendingApprovalRequestsInDb accepts an optional eventIds scope defaulting to null", () => {
    assert.match(
      source,
      /export async function dedupePendingApprovalRequestsInDb\(\s*eventIds: string\[\] \| null = null,\s*\): Promise<number>/,
    );
  });

  it("dedupePendingApprovalRequestsInDb exits cheaply for an empty scope without querying", () => {
    assert.match(
      source,
      /export async function dedupePendingApprovalRequestsInDb\([\s\S]{0,80}\{\s*if \(eventIds && eventIds\.length === 0\) \{\s*return 0;\s*\}/,
    );
  });

  it("dedupePendingApprovalRequestsInDb filters approval_requests by event_id when scoped", () => {
    assert.match(source, /if \(eventIds\) \{\s*query = query\.in\("event_id", eventIds\);\s*\}/);
  });

  it("resolveStalePendingApprovalRequestsForApprovedItems accepts the same eventIds contract", () => {
    assert.match(
      source,
      /export async function resolveStalePendingApprovalRequestsForApprovedItems\(\s*eventIds: string\[\] \| null = null,\s*\): Promise<number>/,
    );
  });

  it("resolveStalePendingApprovalRequestsForApprovedItems exits cheaply for an empty scope", () => {
    const fnSource = source.slice(
      source.indexOf("export async function resolveStalePendingApprovalRequestsForApprovedItems"),
    );
    assert.match(fnSource, /if \(eventIds && eventIds\.length === 0\) \{\s*return 0;\s*\}/);
    assert.match(fnSource, /if \(eventIds\) \{\s*query = query\.in\("event_id", eventIds\);\s*\}/);
  });

  it("preserves the original dedupe-keep-first / cancel-duplicates decision logic unchanged", () => {
    assert.match(source, /const keepIds = new Set<string>\(\);/);
    assert.match(source, /if \(keepIds\.has\(itemId\)\) \{\s*cancelIds\.push\(row\.id as string\);\s*\} else \{\s*keepIds\.add\(itemId\);\s*\}/);
    assert.match(source, /status: "rejected",\s*resolved_at: now,\s*notes: SUPERSEDED_NOTE,/);
  });

  it("preserves the original stale-resolution approved/published clearance logic unchanged", () => {
    assert.match(source, /\.in\("status", \["approved", "published"\]\)/);
    assert.match(source, /status: "approved",\s*resolved_at: now,/);
  });

  it("cancelDuplicatePendingApprovalRequests (single-item, already scoped by communicationItemId) is untouched", () => {
    assert.match(
      source,
      /export async function cancelDuplicatePendingApprovalRequests\(\s*communicationItemId: string,\s*keepRequestId: string,\s*\): Promise<number>/,
    );
  });
});

describe("meta-approval-sync — bounded, scoped backfill", () => {
  const source = readSrc("lib/event-workspace/meta-approval-sync.ts");

  it("backfillMetaApprovalRequests threads an optional scopeEventIds through to both dedupe helpers", () => {
    assert.match(
      source,
      /export async function backfillMetaApprovalRequests\(\s*actor\?: ApprovalActor \| null,\s*scopeEventIds: string\[\] \| null = null,\s*\): Promise<number>/,
    );
    assert.match(
      source,
      /dedupePendingApprovalRequestsInDb\(scopeEventIds\)/,
    );
    assert.match(
      source,
      /resolveStalePendingApprovalRequestsForApprovedItems\(scopeEventIds\)/,
    );
  });

  it("backfillMetaApprovalRequests exits cheaply when scoped to an empty event list", () => {
    const fnSource = source.slice(
      source.indexOf("export async function backfillMetaApprovalRequests("),
    );
    assert.match(fnSource, /if \(scopeEventIds && scopeEventIds\.length === 0\) \{\s*return 0;\s*\}/);
  });

  it("scopes the meta_publication_slots pending-sweep query by event_id when scoped", () => {
    assert.match(
      source,
      /if \(scopeEventIds\) \{\s*slotsQuery = slotsQuery\.in\("event_id", scopeEventIds\);\s*\}/,
    );
  });

  it("keeps the unscoped (null) path fully system-wide for the cron sweep", () => {
    // No unconditional .in("event_id", ...) — the scoping call is inside the `if (scopeEventIds)` guard only.
    const fnSource = source.slice(
      source.indexOf("export async function backfillMetaApprovalRequests("),
      source.indexOf("export async function backfillMetaApprovalRequestsForEvents"),
    );
    const scopingCalls = fnSource.match(/\.in\("event_id"/g) ?? [];
    assert.equal(scopingCalls.length, 1, "exactly one conditional event_id scoping call, gated by scopeEventIds");
  });

  it("exposes a dedicated organization/event-scoped entry point for interactive callers", () => {
    assert.match(
      source,
      /export async function backfillMetaApprovalRequestsForEvents\(\s*eventIds: string\[\],\s*actor\?: ApprovalActor \| null,\s*\): Promise<number>/,
    );
    assert.match(
      source,
      /export async function backfillMetaApprovalRequestsForEvents[\s\S]{0,100}if \(eventIds\.length === 0\) \{\s*return 0;\s*\}/,
    );
  });

  it("backfillMetaApprovalRequestsForEvents always calls the underlying backfill with an explicit (never null) scope", () => {
    const fnSource = source.slice(
      source.indexOf("export async function backfillMetaApprovalRequestsForEvents"),
    );
    assert.match(fnSource, /return backfillMetaApprovalRequests\(actor, eventIds\);/);
  });

  it("does not change the per-event sync loop's parallel execution", () => {
    assert.match(
      source,
      /await Promise\.all\(\s*eventIds\.map\(\(eventId\) => syncMetaApprovalRequestsForEvent\(eventId, actor\)\),\s*\)/,
    );
  });
});

describe("cron token-health route — unscoped system-wide sweep preserved", () => {
  const source = readSrc("app/api/cron/meta-token-health/route.ts");

  it("still calls the unscoped backfillMetaApprovalRequests(null) exactly as before", () => {
    assert.match(source, /backfillMetaApprovalRequests\(null\)\.catch\(/);
    assert.doesNotMatch(source, /backfillMetaApprovalRequestsForEvents/);
  });
});

describe("Approvals page — organization-scoped backfill trigger", () => {
  const source = readSrc("app/(dashboard)/approvals/page.tsx");

  it("resolves the current organization's event ids during render, not inside after()", () => {
    assert.match(source, /resolveScopedOrgEventIds\(undefined\)/);
    const afterIndex = source.indexOf("after(() => {");
    const resolveIndex = source.indexOf("resolveScopedOrgEventIds(undefined)");
    assert.ok(resolveIndex > -1 && afterIndex > -1 && resolveIndex < afterIndex,
      "event ids must be resolved before the after() callback is scheduled");
  });

  it("calls the organization-scoped backfill entry point, never the unscoped one", () => {
    assert.match(source, /backfillMetaApprovalRequestsForEvents\(backfillEventIds, null\)/);
    assert.doesNotMatch(source, /[^.]backfillMetaApprovalRequests\(null\)/);
  });

  it("only schedules the background backfill when there are event ids to reconcile", () => {
    assert.match(source, /if \(backfillEventIds\.length > 0\) \{\s*after\(\(\) => \{/);
  });
});
