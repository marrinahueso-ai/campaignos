"use client";

import { CheckCircle2, Download, Expand } from "lucide-react";
import { useState } from "react";
import { GeneratedArtworkFrame } from "@/components/artwork/GeneratedArtworkFrame";
import { Button } from "@/components/ui/Button";
import { downloadArtworkImage } from "@/lib/artwork-v2/download";
import type { ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import { cn } from "@/lib/utils/cn";

interface ArtworkV2ReviewCardProps {
  version: ArtworkV2ReviewVersion;
  itemLabel: string;
  downloadFilename: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onDeny: () => void;
  onPreviewClick: () => void;
}

function PreviewPlaceholder({ index }: { index: number }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#eef2f0] via-[#f7f3ed] to-[#e9e3da]"
      aria-hidden
    >
      <span className="text-sm font-medium text-cos-muted/80">Preview {index}</span>
    </div>
  );
}

export function ArtworkV2ReviewCard({
  version,
  itemLabel,
  downloadFilename,
  isSelected,
  disabled = false,
  onSelect,
  onDeny,
  onPreviewClick,
}: ArtworkV2ReviewCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    if (!version.imageUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadArtworkImage(
        version.imageUrl,
        downloadFilename.replace("-approved.png", `-v${version.index}.png`),
      );
    } catch {
      // User can retry from the approved screen or picker.
    } finally {
      setIsDownloading(false);
    }
  }

  function handleSelectKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <article
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-cos-card shadow-sm transition-shadow",
        isSelected
          ? "ring-2 ring-cos-primary ring-offset-2 ring-offset-cos-bg"
          : "ring-1 ring-slate-900/[0.04]",
      )}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={isSelected}
        aria-label={`Select version ${version.index} as preferred`}
        onClick={disabled ? undefined : onSelect}
        onKeyDown={handleSelectKeyDown}
        className={cn(
          "relative flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary focus-visible:ring-inset",
          !disabled && "cursor-pointer",
        )}
      >
        {isSelected && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-cos-primary px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Preferred
          </span>
        )}

        {version.imageUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onPreviewClick();
            }}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-cos-border bg-cos-card/95 px-2.5 py-1 text-xs font-medium text-cos-text shadow-sm hover:bg-cos-card"
            aria-label={`View version ${version.index} full size`}
          >
            <Expand className="h-3.5 w-3.5" aria-hidden />
            Expand
          </button>
        )}

        <GeneratedArtworkFrame
          src={version.imageUrl}
          alt={`${itemLabel} preview ${version.index}`}
          className="min-h-0 flex-1 md:min-h-[calc(50dvh-12rem)]"
          placeholder={<PreviewPlaceholder index={version.index} />}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-cos-border/60 px-3 py-3 sm:px-4">
        <span className="text-sm font-medium text-cos-text">Version {version.index}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant={isSelected ? "primary" : "secondary"}
            disabled={disabled}
            onClick={onSelect}
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
          {version.imageUrl && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || isDownloading}
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              {isDownloading ? "Saving…" : "Download"}
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onDeny}>
            Deny
          </Button>
        </div>
      </div>
    </article>
  );
}
