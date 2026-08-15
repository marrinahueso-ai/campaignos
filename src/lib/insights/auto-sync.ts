/**
 * Org / event Insights auto-pull policy for Meta App Review and soft launch.
 * Opening Insights should fetch when empty or stale — without spamming Graph.
 */

/** Auto-sync when last successful sync is older than this. */
export const INSIGHTS_AUTO_SYNC_STALE_MS = 15 * 60 * 1000;

/**
 * A sync run stuck in `running` longer than this is treated as not in progress
 * so Refresh / auto-sync can recover (e.g. crashed mid-sync).
 */
export const INSIGHTS_RUNNING_STALE_MS = 10 * 60 * 1000;

export function isInsightsSyncRunStaleRunning(input: {
  status: string | null | undefined;
  startedAt: string | null | undefined;
  now?: number;
}): boolean {
  if (input.status !== "running") return false;
  if (!input.startedAt?.trim()) return false;
  const startedMs = new Date(input.startedAt).getTime();
  if (Number.isNaN(startedMs)) return false;
  const now = input.now ?? Date.now();
  return now - startedMs >= INSIGHTS_RUNNING_STALE_MS;
}

export function isInsightsSyncInProgress(input: {
  status: string | null | undefined;
  startedAt: string | null | undefined;
  now?: number;
}): boolean {
  if (input.status !== "running") return false;
  return !isInsightsSyncRunStaleRunning(input);
}

export function shouldAutoSyncInsights(input: {
  metaConnected: boolean;
  insightsScopesGranted: boolean;
  /** Org: hasAnyMetrics; event: hasSyncedMetrics (or emptyState !== sync-only when slots exist). */
  hasMetrics: boolean;
  lastSyncAt: string | null;
  syncInProgress: boolean;
  now?: number;
}): boolean {
  if (!input.metaConnected || !input.insightsScopesGranted) {
    return false;
  }
  if (input.syncInProgress) {
    return false;
  }
  // Empty / never pulled — always auto-pull once on open.
  if (!input.hasMetrics || !input.lastSyncAt?.trim()) {
    return true;
  }
  const lastMs = new Date(input.lastSyncAt).getTime();
  if (Number.isNaN(lastMs)) {
    return true;
  }
  const now = input.now ?? Date.now();
  return now - lastMs >= INSIGHTS_AUTO_SYNC_STALE_MS;
}
