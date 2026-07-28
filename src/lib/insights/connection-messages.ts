import type { InsightsConnectionHealth } from "@/lib/insights/types";

/** Customer-facing copy when Page / Instagram Insights permissions are incomplete. */
export function formatMissingInsightsPermissionsMessage(
  missingScopes: string[],
): string {
  const needsFacebook = missingScopes.includes("read_insights");
  const needsInstagram = missingScopes.includes("instagram_manage_insights");

  if (needsFacebook && needsInstagram) {
    return "Reconnect Facebook to finish setup — we still need Page and Instagram Insights permissions.";
  }
  if (needsFacebook) {
    return "Reconnect Facebook to finish Page Insights setup.";
  }
  if (needsInstagram) {
    return "Reconnect Facebook to finish Instagram Insights setup.";
  }
  return "Reconnect Facebook to finish setup.";
}

export function summarizeInsightsSyncWarning(
  connection: InsightsConnectionHealth,
): string | null {
  if (connection.lastSyncWarnings.length > 0) {
    return connection.lastSyncWarnings.join(" ");
  }

  if (connection.lastSyncError) {
    if (/Post \d+:/.test(connection.lastSyncError)) {
      return "Some post numbers are unavailable. Page-level numbers may still be ready.";
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
      message: "Reconnect Facebook to finish setup.",
      severity: "error",
      showReconnect: true,
    };
  }

  if (!connection.insightsScopesGranted) {
    return {
      message: formatMissingInsightsPermissionsMessage(
        connection.missingInsightsScopes,
      ),
      severity: "warning",
      showReconnect: true,
    };
  }

  if (connection.lastSyncStatus === "failed") {
    return {
      message:
        summarizeInsightsSyncWarning(connection) ??
        "We couldn't refresh your Page numbers. Try Refresh again.",
      severity: "error",
      showReconnect: false,
    };
  }

  return null;
}
