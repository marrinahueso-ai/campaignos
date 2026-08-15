import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSIGHTS_AUTO_SYNC_STALE_MS,
  INSIGHTS_RUNNING_STALE_MS,
  isInsightsSyncInProgress,
  isInsightsSyncRunStaleRunning,
  shouldAutoSyncInsights,
} from "../auto-sync.ts";

describe("shouldAutoSyncInsights", () => {
  const base = {
    metaConnected: true,
    insightsScopesGranted: true,
    hasMetrics: false,
    lastSyncAt: null as string | null,
    syncInProgress: false,
    now: Date.parse("2026-08-15T18:00:00.000Z"),
  };

  it("auto-syncs when Meta is ready and metrics are empty", () => {
    assert.equal(shouldAutoSyncInsights(base), true);
  });

  it("skips when Meta is disconnected or scopes are missing", () => {
    assert.equal(
      shouldAutoSyncInsights({ ...base, metaConnected: false }),
      false,
    );
    assert.equal(
      shouldAutoSyncInsights({ ...base, insightsScopesGranted: false }),
      false,
    );
  });

  it("skips while a fresh sync is in progress", () => {
    assert.equal(
      shouldAutoSyncInsights({ ...base, syncInProgress: true }),
      false,
    );
  });

  it("auto-syncs when last sync is older than the stale window", () => {
    const lastSyncAt = new Date(
      base.now - INSIGHTS_AUTO_SYNC_STALE_MS - 1_000,
    ).toISOString();
    assert.equal(
      shouldAutoSyncInsights({
        ...base,
        hasMetrics: true,
        lastSyncAt,
      }),
      true,
    );
  });

  it("does not auto-sync when metrics exist and last sync is fresh", () => {
    const lastSyncAt = new Date(
      base.now - INSIGHTS_AUTO_SYNC_STALE_MS + 60_000,
    ).toISOString();
    assert.equal(
      shouldAutoSyncInsights({
        ...base,
        hasMetrics: true,
        lastSyncAt,
      }),
      false,
    );
  });
});

describe("stale running sync detection", () => {
  const now = Date.parse("2026-08-15T18:00:00.000Z");

  it("treats long-running syncs as stale so Refresh is not stuck", () => {
    const startedAt = new Date(now - INSIGHTS_RUNNING_STALE_MS - 1_000).toISOString();
    assert.equal(
      isInsightsSyncRunStaleRunning({ status: "running", startedAt, now }),
      true,
    );
    assert.equal(
      isInsightsSyncInProgress({ status: "running", startedAt, now }),
      false,
    );
  });

  it("keeps recent running syncs in progress", () => {
    const startedAt = new Date(now - 60_000).toISOString();
    assert.equal(
      isInsightsSyncRunStaleRunning({ status: "running", startedAt, now }),
      false,
    );
    assert.equal(
      isInsightsSyncInProgress({ status: "running", startedAt, now }),
      true,
    );
  });
});
