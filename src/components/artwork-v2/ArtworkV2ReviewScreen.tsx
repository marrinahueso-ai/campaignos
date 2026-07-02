"use client";

import { useEffect, useState } from "react";
import { ArtworkV2ReviewAdjustPanel } from "@/components/artwork-v2/ArtworkV2ReviewAdjustPanel";
import { ArtworkV2ReviewCard } from "@/components/artwork-v2/ArtworkV2ReviewCard";
import { ArtworkV2ReviewEmptyState } from "@/components/artwork-v2/ArtworkV2ReviewEmptyState";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import { Button } from "@/components/ui/Button";
import { buildArtworkDownloadFilename } from "@/lib/artwork-v2/download";
import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";
import type { ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";

interface ArtworkV2ReviewScreenProps {
  item: ArtworkWorkflowItem;
  versions: ArtworkV2ReviewVersion[];
  isBusy?: boolean;
  emptyVariant?: "initial" | "exhausted";
  lastGenerationMode?: ArtworkGenerationMode;
  onApprove: (versionId: string) => void;
  onDeny: (versionId: string) => void;
  onAdjust: (versionId: string, adjustmentComments: string) => void;
  onGenerate: () => void;
  onRegenerate?: (mode: ArtworkGenerationMode) => void;
}

export function ArtworkV2ReviewScreen({
  item,
  versions,
  isBusy = false,
  emptyVariant = "initial",
  lastGenerationMode = "quick",
  onApprove,
  onDeny,
  onAdjust,
  onGenerate,
  onRegenerate,
}: ArtworkV2ReviewScreenProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [adjustmentComments, setAdjustmentComments] = useState("");
  const [lightboxVersion, setLightboxVersion] = useState<ArtworkV2ReviewVersion | null>(
    null,
  );

  useEffect(() => {
    if (selectedVersionId && !versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(null);
    }
  }, [selectedVersionId, versions]);

  if (versions.length === 0) {
    return (
      <ArtworkV2ReviewEmptyState
        variant={emptyVariant}
        lastGenerationMode={lastGenerationMode}
        onGenerate={onGenerate}
        onRegenerate={onRegenerate}
      />
    );
  }

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? null;
  const lightboxSrc = lightboxVersion?.imageUrl ?? null;
  const showRefinedRetry = lastGenerationMode === "quick" && onRegenerate;

  function handleGenerateWithEdits() {
    if (!selectedVersionId || !adjustmentComments.trim()) return;

    onAdjust(selectedVersionId, adjustmentComments.trim());
    setAdjustmentComments("");
  }

  function handleApproveAsIs() {
    if (!selectedVersionId) return;

    onApprove(selectedVersionId);
  }

  return (
    <>
      <div className="flex flex-col">
        <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
          {versions.map((version) => (
            <ArtworkV2ReviewCard
              key={version.id}
              version={version}
              itemLabel={item.label}
              downloadFilename={buildArtworkDownloadFilename(item.label)}
              isSelected={selectedVersionId === version.id}
              disabled={isBusy}
              onSelect={() => setSelectedVersionId(version.id)}
              onDeny={() => onDeny(version.id)}
              onPreviewClick={() => {
                if (version.imageUrl) {
                  setLightboxVersion(version);
                }
              }}
            />
          ))}
        </div>

        <ArtworkV2ReviewAdjustPanel
          selectedVersionIndex={selectedVersion?.index ?? null}
          adjustmentComments={adjustmentComments}
          isBusy={isBusy}
          onCommentsChange={setAdjustmentComments}
          onGenerateWithEdits={handleGenerateWithEdits}
          onApproveAsIs={handleApproveAsIs}
        />

        {showRefinedRetry && (
          <section className="mt-4 rounded-2xl border border-dashed border-cos-border bg-cos-bg/50 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium text-cos-text">Not quite what you wanted?</p>
            <p className="mt-1 text-sm text-cos-muted">
              Try a {ARTWORK_GENERATION_MODE_COPY.refined.title.toLowerCase()} for more layout
              polish and two versions to compare.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isBusy}
                onClick={() => onRegenerate("refined")}
              >
                {isBusy ? "Generating…" : `Generate ${ARTWORK_GENERATION_MODE_COPY.refined.title.toLowerCase()}`}
              </Button>
              <Button type="button" variant="secondary" disabled={isBusy} onClick={onGenerate}>
                Edit prompt & try again
              </Button>
            </div>
          </section>
        )}
      </div>

      {lightboxSrc && lightboxVersion && (
        <ArtworkV2ReviewLightbox
          src={lightboxSrc}
          alt={`${item.label} preview ${lightboxVersion.index}`}
          onClose={() => setLightboxVersion(null)}
        />
      )}
    </>
  );
}
