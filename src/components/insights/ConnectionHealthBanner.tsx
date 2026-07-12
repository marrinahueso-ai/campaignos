import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { InsightsConnectionHealth } from "@/lib/insights/types";
import { cn } from "@/lib/utils/cn";

interface ConnectionHealthBannerProps {
  connection: InsightsConnectionHealth;
}

export function ConnectionHealthBanner({ connection }: ConnectionHealthBannerProps) {
  if (!connection.metaConnected) {
    return null;
  }

  const needsReconnect = connection.reconnectRequired;
  const needsInsightsScopes = !connection.insightsScopesGranted;
  const syncFailed = connection.lastSyncStatus === "failed";

  if (!needsReconnect && !needsInsightsScopes && !syncFailed) {
    return null;
  }

  let message = "";
  if (needsReconnect) {
    message = "Your Meta connection needs to be refreshed before insights can sync.";
  } else if (needsInsightsScopes) {
    message =
      "Insights permissions are missing. Reconnect Meta to grant read_insights and instagram_manage_insights.";
  } else if (syncFailed) {
    message = connection.lastSyncError ?? "The last insights sync failed.";
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        needsReconnect || syncFailed
          ? "border-cos-error/30 bg-cos-error-bg text-cos-error-text"
          : "border-cos-warning/60 bg-cos-warning text-cos-warning-text",
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium">{message}</p>
          {connection.pageName ? (
            <p className="mt-1 text-xs opacity-80">Connected page: {connection.pageName}</p>
          ) : null}
        </div>
      </div>
      <Link
        href="/settings/meta?returnTo=/insights"
        className="inline-flex h-9 items-center justify-center border border-current px-4 text-xs font-medium"
      >
        Reconnect Meta
      </Link>
    </div>
  );
}
