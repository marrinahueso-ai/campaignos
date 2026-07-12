import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
      <div className="cos-card flex flex-col items-center px-6 py-12 text-center">
        <BarChart3 className="h-8 w-8 text-cos-accent" strokeWidth={1.5} />
        <h2 className="font-display mt-4 text-2xl text-cos-text">Connect Meta to get started</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-cos-muted">
          Insights pulls real performance data from your connected Facebook Page and
          Instagram account for {organizationName ?? "your organization"}.
        </p>
        <Button href="/settings/meta?returnTo=/insights" className="mt-6">
          Connect Meta
        </Button>
      </div>
    );
  }

  return (
    <div className="cos-card flex flex-col items-center px-6 py-10 text-center">
      <RefreshCw className="h-7 w-7 text-cos-accent" strokeWidth={1.5} />
      <h2 className="font-display mt-4 text-2xl text-cos-text">Sync insights from Meta</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-cos-muted">
        Meta is connected, but no analytics are stored yet. Run a sync to pull reach,
        engagement, and post performance into Hey Ralli.
      </p>
      {missingScopes.length > 0 ? (
        <p className="mt-3 max-w-lg text-xs text-cos-warning-text">
          Missing scopes: {missingScopes.join(", ")}. Reconnect Meta after adding them in
          your Meta app, then sync again.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        <Link
          href="/settings/meta?returnTo=/insights"
          className="text-sm text-cos-muted hover:text-cos-text"
        >
          Review Meta connection
        </Link>
      </div>
    </div>
  );
}
