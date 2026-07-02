"use client";

import { useRef, useState, useTransition } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AssetPreview,
  formatAssetTimestamp,
  getAssetDownloadUrl,
} from "@/components/creative-assets/AssetPreview";
import { AssetVersionHistory } from "@/components/creative-assets/AssetVersionHistory";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import {
  deleteCampaignAssetAction,
  uploadCampaignAssetAction,
} from "@/lib/creative-assets/actions";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";

interface CreativeAssetCardProps {
  eventId: string;
  asset: EventAsset;
  versions?: EventAssetVersion[];
  canUpload?: boolean;
  canDelete?: boolean;
  canRestoreVersion?: boolean;
  compact?: boolean;
  onChanged?: () => void;
}

export function CreativeAssetCard({
  eventId,
  asset,
  versions = [],
  canUpload = true,
  canDelete = true,
  canRestoreVersion = false,
  compact = false,
  onChanged,
}: CreativeAssetCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasFile = asset.status === "uploaded";
  const downloadUrl = getAssetDownloadUrl(asset.storagePath);
  const typeLabel = getCreativeAssetTypeLabel(asset.assetType);
  const showCanva = asset.assetType === "canva_link" || Boolean(asset.canvaUrl);

  function refresh() {
    onChanged?.();
  }

  function handleReplaceClick() {
    setError(null);
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadCampaignAssetAction(eventId, asset.id, formData);
      if (!result.success) {
        setError(result.error);
      } else {
        refresh();
      }
      event.target.value = "";
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaignAssetAction(eventId, asset.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirmDelete(false);
      refresh();
    });
  }

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
        {hasFile ? (
          <AssetPreview
            filename={asset.filename}
            storagePath={asset.storagePath}
            alt={asset.filename ?? typeLabel}
          />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border-b border-cos-border bg-cos-bg/30 px-4 text-center">
            <p className="text-sm font-medium text-cos-text">{typeLabel}</p>
            <p className="text-xs text-cos-muted">No file uploaded yet</p>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-cos-text">
                {asset.filename ?? typeLabel}
              </p>
              <p className="mt-0.5 text-xs text-cos-muted">{typeLabel}</p>
            </div>
            <Badge variant={hasFile ? "success" : "warning"}>
              {hasFile ? `v${asset.currentVersion}` : "Empty"}
            </Badge>
          </div>

          {!compact && (
            <dl className="space-y-1 text-xs text-cos-muted">
              {hasFile && (
                <>
                  <div className="flex justify-between gap-2">
                    <dt>Uploaded</dt>
                    <dd>{formatAssetTimestamp(asset.updatedAt)}</dd>
                  </div>
                  {asset.uploadedBy && (
                    <div className="flex justify-between gap-2">
                      <dt>By</dt>
                      <dd>{asset.uploadedBy}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          )}

          {error && <p className="text-xs text-cos-error">{error}</p>}

          <div className="mt-auto flex flex-wrap gap-2">
            {hasFile && downloadUrl && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button size="sm" variant="secondary" href={downloadUrl} target="_blank">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </>
            )}
            {showCanva && asset.canvaUrl && (
              <Button size="sm" variant="secondary" href={asset.canvaUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Open Canva
              </Button>
            )}
            {canUpload && (
              <Button
                size="sm"
                variant={hasFile ? "secondary" : "primary"}
                disabled={isPending}
                onClick={handleReplaceClick}
              >
                {hasFile ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Replace
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            )}
            {canDelete && hasFile && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            {(versions.length > 0 || asset.currentVersion > 1) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowVersions((open) => !open)}
              >
                History
              </Button>
            )}
          </div>

          {showVersions && (
            <AssetVersionHistory
              eventId={eventId}
              assetId={asset.id}
              currentVersion={asset.currentVersion}
              versions={versions}
              canRestore={canRestoreVersion}
              onRestored={refresh}
            />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </article>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-cos-border bg-cos-card p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-cos-text">Delete this asset?</h2>
            <p className="mt-2 text-sm text-cos-muted">
              The current file will be removed from this campaign. You can upload a new
              file anytime.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" disabled={isPending} onClick={handleDelete}>
                {isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && downloadUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/30 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] max-w-4xl items-center justify-center overflow-auto rounded-2xl bg-cos-card p-4 shadow-xl">
            <Button
              size="sm"
              variant="secondary"
              className="mb-3"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={downloadUrl}
              alt={asset.filename ?? typeLabel}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

interface UploadAssetCardProps {
  eventId: string;
  assetType?: import("@/types/event-workspace").EventAssetType;
  onUploaded?: () => void;
}

export function UploadAssetCard({
  eventId,
  assetType = "miscellaneous",
  onUploaded,
}: UploadAssetCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const { createAndUploadCampaignAssetAction } = await import(
        "@/lib/creative-assets/actions"
      );
      const result = await createAndUploadCampaignAssetAction(
        eventId,
        assetType,
        formData,
      );
      if (!result.success) {
        setError(result.error);
      } else {
        onUploaded?.();
      }
      event.target.value = "";
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cos-border bg-cos-bg/40 p-6 text-center transition-colors hover:border-cos-primary hover:bg-cos-bg"
    >
      <Upload className="h-8 w-8 text-cos-muted" />
      <div>
        <p className="text-sm font-medium text-cos-text">Upload asset</p>
        <p className="mt-1 text-xs text-cos-muted">PNG, JPG, WebP, or PDF up to 10 MB</p>
      </div>
      {error && <p className="text-xs text-cos-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
