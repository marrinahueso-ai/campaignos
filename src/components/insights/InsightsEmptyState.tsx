import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMissingInsightsPermissionsMessage } from "@/lib/insights/connection-messages";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";

interface InsightsEmptyStateProps {
  variant: "connect" | "sync";
  organizationName?: string;
  onSync?: () => void;
  syncing?: boolean;
  missingScopes?: string[];
}

export function InsightsEmptyState({
  variant,
  organizationName,
  onSync,
  syncing = false,
  missingScopes = [],
}: InsightsEmptyStateProps) {
  if (variant === "connect") {
    return (
      <div className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-6 py-14 text-center shadow-sm">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cos-accent-soft)] text-[var(--cos-warning-text)]">
          <BarChart3 className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h2 className="font-display mt-4 text-2xl text-cos-text">
          Connect Meta to get started
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted">
          Insights shows organic performance from your Facebook Page and
          Instagram account for {organizationName ?? "your organization"}.
          Connect once — the same connection powers publishing and inbox. No ads
          data. No audience demographics on this page.
        </p>
        <Button
          href={buildMetaOAuthStartPath({ returnTo: "/insights" })}
          className="mt-6"
        >
          Connect with Facebook
        </Button>
        <p className="mt-3 text-xs text-cos-muted">
          Or manage in{" "}
          <Link
            href={buildIntegrationSettingsPath("meta", "/insights")}
            className="font-medium text-cos-accent hover:text-cos-muted"
          >
            Meta settings
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-6 py-14 text-center shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cos-bg text-cos-muted">
        <RefreshCw className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h2 className="font-display mt-4 text-2xl text-cos-text">
        Refresh your Page numbers
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted">
        Meta is connected, but we don’t have numbers yet. Refresh to pull
        organic views, reach, and post performance into Hey Ralli.
      </p>
      {missingScopes.length > 0 ? (
        <p className="mt-3 max-w-md text-xs text-cos-warning-text">
          {formatMissingInsightsPermissionsMessage(missingScopes)}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onSync} disabled={syncing}>
          {syncing ? "Refreshing…" : "Refresh your Page numbers"}
        </Button>
        <Link
          href={buildIntegrationSettingsPath("meta", "/insights")}
          className="text-sm text-cos-muted hover:text-cos-text"
        >
          Review Meta connection
        </Link>
      </div>
    </div>
  );
}
