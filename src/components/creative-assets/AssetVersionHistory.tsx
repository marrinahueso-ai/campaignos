"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatAssetTimestamp } from "@/components/creative-assets/AssetPreview";
import { restoreCampaignAssetVersionAction } from "@/lib/creative-assets/actions";
import type { EventAssetVersion } from "@/types/event-workspace";

interface AssetVersionHistoryProps {
  eventId: string;
  assetId: string;
  currentVersion: number;
  versions: EventAssetVersion[];
  canRestore: boolean;
  onRestored?: () => void;
}

export function AssetVersionHistory({
  eventId,
  assetId,
  currentVersion,
  versions,
  canRestore,
  onRestored,
}: AssetVersionHistoryProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRestore(versionId: string) {
    startTransition(async () => {
      const result = await restoreCampaignAssetVersionAction(
        eventId,
        assetId,
        versionId,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      onRestored?.();
    });
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-cos-muted">
        Version {currentVersion} is current. Previous versions appear here after replace.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-cos-border bg-cos-bg/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
        Version history
      </p>
      {error && <p className="mt-2 text-xs text-cos-error">{error}</p>}
      <ul className="mt-2 space-y-2">
        <li className="flex items-center justify-between gap-2 text-sm">
          <span className="text-cos-text">Version {currentVersion}</span>
          <Badge variant="success">Current</Badge>
        </li>
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div className="min-w-0">
              <p className="text-cos-text">
                Version {version.versionNumber}
                {version.filename ? ` — ${version.filename}` : ""}
              </p>
              <p className="text-xs text-cos-muted">
                {formatAssetTimestamp(version.createdAt)}
                {version.uploadedBy ? ` · ${version.uploadedBy}` : ""}
              </p>
            </div>
            {canRestore && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleRestore(version.id)}
              >
                Restore
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
