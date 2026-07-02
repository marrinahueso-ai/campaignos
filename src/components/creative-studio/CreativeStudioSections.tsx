"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreativeAssetCard,
  UploadAssetCard,
} from "@/components/creative-assets/CreativeAssetCard";
import { AssetPreview, formatAssetTimestamp } from "@/components/creative-assets/AssetPreview";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import {
  duplicateInspirationAction,
  toggleInspirationFavoriteAction,
} from "@/lib/creative-assets/actions";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";

interface CampaignAssetsSectionProps {
  eventId: string | null;
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  canUpload: boolean;
  canDelete: boolean;
  canRestoreVersion: boolean;
  searchQuery?: string;
}

export function CampaignAssetsSection({
  eventId,
  assets,
  assetVersions,
  canUpload,
  canDelete,
  canRestoreVersion,
  searchQuery = "",
}: CampaignAssetsSectionProps) {
  const router = useRouter();
  const uploadedAssets = assets.filter((asset) => asset.status === "uploaded");
  const pendingSlots = assets.filter((asset) => asset.status !== "uploaded");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pool = [...uploadedAssets, ...pendingSlots];
    if (!q) return pool;
    return pool.filter((asset) => {
      const label = getCreativeAssetTypeLabel(asset.assetType).toLowerCase();
      const name = (asset.filename ?? "").toLowerCase();
      const tags = asset.tags.join(" ").toLowerCase();
      return label.includes(q) || name.includes(q) || tags.includes(q);
    });
  }, [uploadedAssets, pendingSlots, searchQuery]);

  function refresh() {
    router.refresh();
  }

  if (!eventId) {
    return (
      <section id="campaign-assets" className="scroll-mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Assets</CardTitle>
            <CardDescription>
              Select a campaign to view and manage its visual assets.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section id="campaign-assets" className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-cos-text">Campaign Assets</h2>
        <p className="mt-1 text-sm text-cos-muted">
          All visual files for the selected campaign.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((asset) => (
          <CreativeAssetCard
            key={asset.id}
            eventId={eventId}
            asset={asset}
            versions={assetVersions[asset.id] ?? []}
            canUpload={canUpload}
            canDelete={canDelete}
            canRestoreVersion={canRestoreVersion}
            onChanged={refresh}
          />
        ))}

        {canUpload && <UploadAssetCard eventId={eventId} onUploaded={refresh} />}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-cos-muted">
          {searchQuery.trim()
            ? "No assets match your search."
            : "No assets uploaded yet for this campaign. Use the upload card or empty slots below to add files."}
        </p>
      )}
    </section>
  );
}

interface InspirationLibrarySectionProps {
  items: InspirationAsset[];
  targetEventId: string | null;
  canDuplicate: boolean;
}

export function InspirationLibrarySection({
  items,
  targetEventId,
  canDuplicate,
}: InspirationLibrarySectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (favoritesOnly && !item.isFavorite) return false;
      if (yearFilter && !item.campaignYear.includes(yearFilter)) return false;
      if (typeFilter && item.assetType !== typeFilter) return false;
      if (!q) return true;
      return (
        item.eventTitle.toLowerCase().includes(q) ||
        item.campaignYear.toLowerCase().includes(q) ||
        getCreativeAssetTypeLabel(item.assetType).toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (item.filename ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, yearFilter, typeFilter, favoritesOnly]);

  return (
    <section id="inspiration-library" className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-cos-text">Inspiration Library</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Browse artwork from past campaigns for future reference.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search campaigns, tags, filenames…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Input
          placeholder="Filter by year"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        />
        <Input
          placeholder="Asset type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-cos-muted">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          Favorites only
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <InspirationCard
            key={item.assetId}
            item={item}
            targetEventId={targetEventId}
            canDuplicate={canDuplicate}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No inspiration assets yet. Uploaded artwork from past campaigns will appear
          here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-cos-muted">No inspiration assets match your filters.</p>
      ) : null}
    </section>
  );
}

function InspirationCard({
  item,
  targetEventId,
  canDuplicate,
  onChanged,
}: {
  item: InspirationAsset;
  targetEventId: string | null;
  canDuplicate: boolean;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function toggleFavorite() {
    startTransition(async () => {
      await toggleInspirationFavoriteAction(item.assetId, !item.isFavorite);
      onChanged();
    });
  }

  function duplicate() {
    if (!targetEventId) return;
    startTransition(async () => {
      await duplicateInspirationAction(item.assetId, targetEventId);
      onChanged();
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
      <AssetPreview
        filename={item.filename}
        storagePath={item.storagePath}
        alt={item.filename ?? item.eventTitle}
      />
      <div className="space-y-2 p-3 text-xs">
        <p className="text-sm font-medium text-cos-text">{item.eventTitle}</p>
        <p className="text-cos-muted">
          {item.campaignYear} · {getCreativeAssetTypeLabel(item.assetType)}
        </p>
        <p className="text-cos-muted">{formatAssetTimestamp(item.uploadedAt)}</p>
        {item.tags.length > 0 && (
          <p className="text-cos-muted">Tags: {item.tags.join(", ")}</p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            className="font-medium text-cos-primary hover:underline disabled:opacity-50"
            disabled={isPending}
            onClick={toggleFavorite}
          >
            {item.isFavorite ? "★ Favorite" : "Save as favorite"}
          </button>
          {canDuplicate && targetEventId && (
            <button
              type="button"
              className="font-medium text-cos-primary hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={duplicate}
            >
              Duplicate to campaign
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
