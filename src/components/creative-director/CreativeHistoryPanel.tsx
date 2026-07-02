"use client";

import { formatAssetTimestamp } from "@/components/creative-assets/AssetPreview";
import { AssetVersionHistory } from "@/components/creative-assets/AssetVersionHistory";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";

interface CreativeHistoryPanelProps {
  eventId: string;
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  canRestore: boolean;
  onChanged?: () => void;
}

export function CreativeHistoryPanel({
  eventId,
  assets,
  assetVersions,
  canRestore,
  onChanged,
}: CreativeHistoryPanelProps) {
  const uploaded = assets.filter((asset) => asset.status === "uploaded");

  if (uploaded.length === 0) {
    return (
      <p className="text-sm text-cos-muted">
        Version history appears here after you upload artwork.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-cos-text">History</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Replace and restore previous versions of campaign artwork.
        </p>
      </div>
      <div className="space-y-4">
        {uploaded.map((asset) => {
          const versions = assetVersions[asset.id] ?? [];
          if (versions.length === 0 && asset.currentVersion <= 1) return null;
          return (
            <article
              key={asset.id}
              className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-cos-text">
                  {asset.filename ?? getCreativeAssetTypeLabel(asset.assetType)}
                </h3>
                <span className="text-xs text-cos-muted">
                  Updated {formatAssetTimestamp(asset.updatedAt)}
                </span>
              </div>
              <AssetVersionHistory
                eventId={eventId}
                assetId={asset.id}
                currentVersion={asset.currentVersion}
                versions={versions}
                canRestore={canRestore}
                onRestored={onChanged}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
