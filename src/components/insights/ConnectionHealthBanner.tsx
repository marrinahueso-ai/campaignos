import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getInsightsConnectionAlert } from "@/lib/insights/connection-messages";
import type { InsightsConnectionHealth } from "@/lib/insights/types";
import { buildMetaOAuthStartPath } from "@/lib/integrations/oauth";
import { cn } from "@/lib/utils/cn";

interface ConnectionHealthBannerProps {
  connection: InsightsConnectionHealth;
}

/** Compact banner for blocking Meta connection issues only. */
export function ConnectionHealthBanner({ connection }: ConnectionHealthBannerProps) {
  const alert = getInsightsConnectionAlert(connection);
  if (!alert) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm",
        alert.severity === "error"
          ? "border-cos-error/30 bg-cos-error-bg text-cos-error-text"
          : "border-cos-warning/60 bg-cos-warning text-cos-warning-text",
      )}
      role="status"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <p className="min-w-0 flex-1">{alert.message}</p>
      {alert.showReconnect ? (
        <Link
          href={buildMetaOAuthStartPath({
            returnTo: "/insights",
            authType: "rerequest",
          })}
          className="shrink-0 text-xs font-medium underline underline-offset-2"
        >
          Reconnect Meta
        </Link>
      ) : null}
    </div>
  );
}
