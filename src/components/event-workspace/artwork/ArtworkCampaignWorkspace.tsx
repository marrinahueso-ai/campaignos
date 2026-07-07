"use client";

import { useState } from "react";
import { ArtworkCustomizeToolbar, type ArtworkCustomizeAction } from "@/components/event-workspace/artwork/ArtworkCustomizeToolbar";
import { ArtworkGeneratedOptionsGrid } from "@/components/event-workspace/artwork/ArtworkGeneratedOptionsGrid";
import { ArtworkPageHeader } from "@/components/event-workspace/artwork/ArtworkPageHeader";
import { ArtworkPromptPanel } from "@/components/event-workspace/artwork/ArtworkPromptPanel";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import {
  metaPlacementToDefaultFormatLabel,
  resolveArtworkPreviewAspectRatio,
} from "@/lib/artwork-v2/format-selection";
import type { ArtworkV2Reference, ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";

const CUSTOMIZE_PROMPTS: Record<ArtworkCustomizeAction, string> = {
  "edit-text": "Update the text — wording, hierarchy, and placement.",
  "change-colors": "Adjust the color palette — warmer, brighter, or more on-brand.",
  "swap-elements": "Swap or rearrange visual elements — icons, illustrations, layout.",
  resize: "Resize or reframe the layout for better balance.",
  "add-logo": "Add or reposition the school or PTO logo.",
};

interface ArtworkCampaignWorkspaceProps {
  item: ArtworkWorkflowItem;
  prompt: string;
  format: string;
  references: ArtworkV2Reference[];
  versions: ArtworkV2ReviewVersion[];
  generationMode: ArtworkGenerationMode;
  selectedVersionId: string | null;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  isApprovingInspiration?: boolean;
  error?: string | null;
  reviewError?: string | null;
  generationWarning?: string | null;
  onPromptChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onGenerationModeChange: (mode: ArtworkGenerationMode) => void;
  onGenerate: (mode: ArtworkGenerationMode) => void;
  onApproveInspiration: (referenceId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onApproveSelected: () => void;
  onGenerateMore: () => void;
  onCustomizeAction: (action: ArtworkCustomizeAction) => void;
}

export function ArtworkCampaignWorkspace({
  item,
  prompt,
  format,
  references,
  versions,
  generationMode,
  selectedVersionId,
  isGenerating = false,
  isReviewBusy = false,
  error = null,
  reviewError = null,
  generationWarning = null,
  onPromptChange,
  onFormatChange,
  onReferencesChange,
  onGenerationModeChange,
  onGenerate,
  onSelectVersion,
  onApproveSelected,
  onGenerateMore,
  onCustomizeAction,
}: ArtworkCampaignWorkspaceProps) {
  const [brandStyle, setBrandStyle] = useState("Hey Ralli (Primary)");
  const [colorVibe, setColorVibe] = useState("Colorful & Playful");
  const [lightboxVersion, setLightboxVersion] = useState<ArtworkV2ReviewVersion | null>(null);

  const hasSelection = selectedVersionId != null;
  const hasGeneratedVersions = versions.length > 0;
  const previewAspectRatio = resolveArtworkPreviewAspectRatio(
    item.metaPlacement === "story" ? "story" : "feed",
  );

  function handleCustomizeAction(action: ArtworkCustomizeAction) {
    onCustomizeAction(action);
    const editHint = CUSTOMIZE_PROMPTS[action];
    if (!prompt.trim()) {
      onPromptChange(editHint);
      return;
    }

    if (!prompt.includes(editHint)) {
      onPromptChange(`${prompt.trim()}\n\n${editHint}`);
    }
  }

  function handleGenerateClick() {
    onGenerate(generationMode);
  }

  return (
    <>
      <ArtworkPageHeader />

      {generationWarning && (
        <p className="mb-4 text-sm text-amber-700" role="status">
          {generationWarning}
        </p>
      )}

      {(error || reviewError) && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error ?? reviewError}
        </p>
      )}

      <div className="space-y-6">
        <ArtworkPromptPanel
          prompt={prompt}
          onPromptChange={onPromptChange}
          format={format || metaPlacementToDefaultFormatLabel(item.metaPlacement === "story" ? "story" : "feed")}
          onFormatChange={onFormatChange}
          brandStyle={brandStyle}
          onBrandStyleChange={setBrandStyle}
          colorVibe={colorVibe}
          onColorVibeChange={setColorVibe}
          generationMode={generationMode}
          onGenerationModeChange={onGenerationModeChange}
          references={references}
          onReferencesChange={onReferencesChange}
          onGenerate={handleGenerateClick}
          onApproveSelected={onApproveSelected}
          hasSelection={hasSelection && hasGeneratedVersions}
          isGenerating={isGenerating}
          isReviewBusy={isReviewBusy}
          generateDisabled={!prompt.trim()}
          disabled={isGenerating || isReviewBusy}
        />

        <ArtworkGeneratedOptionsGrid
          versions={versions}
          itemLabel={item.label}
          selectedVersionId={selectedVersionId}
          aspectRatio={previewAspectRatio}
          onSelectVersion={onSelectVersion}
          onPreviewVersion={(version) => setLightboxVersion(version)}
          onGenerateMore={hasGeneratedVersions ? onGenerateMore : undefined}
          isGeneratingMore={isGenerating || isReviewBusy}
          disabled={isReviewBusy || !hasGeneratedVersions}
        />

        <ArtworkCustomizeToolbar
          onAction={handleCustomizeAction}
          disabled={!hasSelection || isReviewBusy || !hasGeneratedVersions}
        />
      </div>

      {lightboxVersion?.imageUrl && (
        <ArtworkV2ReviewLightbox
          src={lightboxVersion.imageUrl}
          alt={`${item.label} option ${lightboxVersion.index}`}
          onClose={() => setLightboxVersion(null)}
        />
      )}
    </>
  );
}
