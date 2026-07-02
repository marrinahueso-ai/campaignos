"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, ImageIcon, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { uploadEventAssetAction } from "@/lib/event-workspace/actions";
import { EVENT_ASSET_TYPES } from "@/lib/event-workspace/constants";
import {
  isPdfAsset,
  resolveAssetImageUrl,
} from "@/lib/event-workspace/storage";
import type { EventAsset } from "@/types/event-workspace";

interface EventAssetCardProps {
  eventId: string;
  asset: EventAsset;
}

function getAssetLabel(assetType: EventAsset["assetType"]): string {
  return (
    EVENT_ASSET_TYPES.find((entry) => entry.assetType === assetType)?.label ??
    assetType
  );
}

function getStatusBadge(status: EventAsset["status"]) {
  switch (status) {
    case "uploaded":
      return { label: "Ready", variant: "success" as const };
    case "pending":
      return { label: "Still needed", variant: "warning" as const };
    default:
      return { label: "Still needed", variant: "default" as const };
  }
}

function formatAssetDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventAssetCard({ eventId, asset }: EventAssetCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const previewUrl = resolveAssetImageUrl(asset.storagePath);
  const isPdf = isPdfAsset(asset.filename, asset.storagePath);
  const statusBadge = getStatusBadge(asset.status);
  const uploadedAt =
    asset.status === "uploaded" ? formatAssetDate(asset.updatedAt) : null;

  function handleUploadClick() {
    setError(null);
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadEventAssetAction(eventId, asset.id, formData);
      if (!result.success) {
        setError(result.error);
      }
      event.target.value = "";
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-cos-card shadow-sm">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f7f6f3]">
        {previewUrl && !isPdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={asset.filename ?? getAssetLabel(asset.assetType)}
            className="max-h-full max-w-full object-contain object-center"
          />
        ) : isPdf ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-cos-muted">
            <FileText className="h-10 w-10 stroke-[1.25]" />
            <span className="text-xs font-medium">PDF document</span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-cos-muted">
            <ImageIcon className="h-10 w-10 stroke-[1.25]" />
            <span className="text-xs font-medium text-cos-muted">Add when ready</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cos-text">
              {asset.filename ?? getAssetLabel(asset.assetType)}
            </p>
            <p className="mt-0.5 text-xs text-cos-muted">
              {getAssetLabel(asset.assetType)}
            </p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>

        {uploadedAt && (
          <p className="text-xs text-cos-muted">Uploaded {uploadedAt}</p>
        )}

        {error && <p className="text-xs text-cos-error">{error}</p>}

        <div className="mt-auto pt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUploadClick}
            disabled={isPending}
            className="w-full"
          >
            <Upload className="h-4 w-4" />
            {asset.status === "uploaded" ? "Replace" : "Upload"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </article>
  );
}
