"use client";

import { RefreshCw } from "lucide-react";
import { GeneratedArtworkFrame } from "@/components/artwork/GeneratedArtworkFrame";
import type { ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import { cn } from "@/lib/utils/cn";

const GRID_SLOTS = 4;

interface ArtworkGeneratedOptionsGridProps {
  versions: ArtworkV2ReviewVersion[];
  itemLabel: string;
  selectedVersionId: string | null;
  aspectRatio?: "square" | "story";
  onSelectVersion: (versionId: string) => void;
  onPreviewVersion?: (version: ArtworkV2ReviewVersion) => void;
  onGenerateMore?: () => void;
  isGeneratingMore?: boolean;
  disabled?: boolean;
}

function slotAspectClass(aspectRatio: "square" | "story"): string {
  return aspectRatio === "story" ? "aspect-[9/16]" : "aspect-square";
}

export function ArtworkGeneratedOptionsGrid({
  versions,
  itemLabel,
  selectedVersionId,
  aspectRatio = "square",
  onSelectVersion,
  onPreviewVersion,
  onGenerateMore,
  isGeneratingMore = false,
  disabled = false,
}: ArtworkGeneratedOptionsGridProps) {
  const slots = Array.from({ length: GRID_SLOTS }, (_, index) => versions[index] ?? null);
  const aspectClass = slotAspectClass(aspectRatio);

  return (
    <section className="space-y-4">
      <p className="cos-section-title">AI generated options</p>

      <div
        className={cn(
          "grid gap-3",
          aspectRatio === "story"
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {slots.map((version, index) => {
          if (!version) {
            return (
              <div
                key={`empty-${index}`}
                className={cn(
                  aspectClass,
                  "rounded-sm border-2 border-dashed border-cos-border/80 bg-cos-bg/40",
                )}
                aria-hidden
              />
            );
          }

          const isSelected = selectedVersionId === version.id;

          return (
            <button
              key={version.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectVersion(version.id)}
              onDoubleClick={() => onPreviewVersion?.(version)}
              className={cn(
                aspectClass,
                "relative overflow-hidden border border-cos-border bg-[#f7f6f3] text-left transition-shadow",
                isSelected && "ring-2 ring-cos-dark ring-offset-2 ring-offset-cos-card",
                !disabled && "cursor-pointer hover:shadow-sm",
              )}
              aria-pressed={isSelected}
              aria-label={`Select artwork option ${version.index}`}
            >
              <GeneratedArtworkFrame
                src={version.imageUrl}
                alt={`${itemLabel} option ${version.index}`}
                className="h-full w-full"
                placeholder={
                  <span className="text-xs text-cos-muted">Option {version.index}</span>
                }
              />
              {isSelected && (
                <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-cos-dark ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {onGenerateMore && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-cos-muted">Don&apos;t love these?</span>
          <button
            type="button"
            disabled={disabled || isGeneratingMore}
            onClick={onGenerateMore}
            className="inline-flex h-9 items-center gap-1.5 border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isGeneratingMore && "animate-spin")}
              aria-hidden
            />
            {isGeneratingMore ? "Generating…" : "Generate more"}
          </button>
        </div>
      )}
    </section>
  );
}
