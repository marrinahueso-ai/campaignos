import type { InsightsConnectionHealth } from "@/lib/insights/types";

export function summarizeInsightsSyncWarning(
  connection: InsightsConnectionHealth,
): string | null {
  if (connection.lastSyncWarnings.length > 0) {
    return connection.lastSyncWarnings.join(" ");
  }

  if (connection.lastSyncError) {
    if (/Post \d+:/.test(connection.lastSyncError)) {
      return "Some metrics are unavailable. Account-level data may still have synced.";
    }
    return connection.lastSyncError;
  }

  return null;
}

/** Soft sync gaps (partial post metrics) — not connection-breaking. */
export function getInsightsDataNote(
  connection: InsightsConnectionHealth,
): string | null {
  if (!connection.metaConnected) {
    return null;
  }

  const hasPartialWarnings =
    connection.lastSyncStatus === "completed" &&
    connection.lastSyncWarnings.length > 0;

  if (!hasPartialWarnings) {
    return null;
  }

  return summarizeInsightsSyncWarning(connection);
}

export type InsightsConnectionAlert = {
  message: string;
  severity: "error" | "warning";
  showReconnect: boolean;
};

/** Blocking connection issues only — keep out of full-page soft banners. */
export function getInsightsConnectionAlert(
  connection: InsightsConnectionHealth,
): InsightsConnectionAlert | null {
  if (!connection.metaConnected) {
    return null;
  }

  if (connection.reconnectRequired) {
    return {
      message:
        "Your Meta connection needs to be refreshed before insights can sync.",
      severity: "error",
      showReconnect: true,
    };
  }

  if (!connection.insightsScopesGranted) {
    return {
      message:
        "Insights permissions are missing. Reconnect Meta to grant read_insights and instagram_manage_insights.",
      severity: "warning",
      showReconnect: true,
    };
  }

  if (connection.lastSyncStatus === "failed") {
    return {
      message:
        summarizeInsightsSyncWarning(connection) ??
        "The last insights sync failed.",
      severity: "error",
      showReconnect: false,
    };
  }

  return null;
}
