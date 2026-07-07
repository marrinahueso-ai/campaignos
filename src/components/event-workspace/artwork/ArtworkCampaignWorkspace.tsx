"use client";

import { useState } from "react";
import { ArtworkCustomizeToolbar, type ArtworkCustomizeAction } from "@/components/event-workspace/artwork/ArtworkCustomizeToolbar";
import { ArtworkGeneratedOptionsGrid } from "@/components/event-workspace/artwork/ArtworkGeneratedOptionsGrid";
import { ArtworkGenerationModeSection } from "@/components/event-workspace/artwork/ArtworkGenerationModeSection";
import { ArtworkInspirationUpload } from "@/components/event-workspace/artwork/ArtworkInspirationUpload";
import { ArtworkPageHeader } from "@/components/event-workspace/artwork/ArtworkPageHeader";
import { ArtworkPromptPanel } from "@/components/event-workspace/artwork/ArtworkPromptPanel";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
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
  references: ArtworkV2Reference[];
  versions: ArtworkV2ReviewVersion[];
  generationMode: ArtworkGenerationMode;
  selectedVersionId: string | null;
  adjustmentComments: string;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  isApprovingInspiration?: boolean;
  error?: string | null;
  reviewError?: string | null;
  generationWarning?: string | null;
  showReview?: boolean;
  onPromptChange: (value: string) => void;
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onGenerationModeChange: (mode: ArtworkGenerationMode) => void;
  onGenerate: (mode: ArtworkGenerationMode) => void;
  onApproveInspiration: (referenceId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onAdjustmentCommentsChange: (value: string) => void;
  onGenerateWithEdits: () => void;
  onApproveSelected: () => void;
  onGenerateMore: () => void;
  onCustomizeAction: (action: ArtworkCustomizeAction) => void;
}

export function ArtworkCampaignWorkspace({
  item,
  prompt,
  references,
  versions,
  generationMode,
  selectedVersionId,
  adjustmentComments,
  isGenerating = false,
  isReviewBusy = false,
  isApprovingInspiration = false,
  error = null,
  reviewError = null,
  generationWarning = null,
  showReview = false,
  onPromptChange,
  onReferencesChange,
  onGenerationModeChange,
  onGenerate,
  onApproveInspiration,
  onSelectVersion,
  onAdjustmentCommentsChange,
  onGenerateWithEdits,
  onApproveSelected,
  onGenerateMore,
  onCustomizeAction,
}: ArtworkCampaignWorkspaceProps) {
  const [format, setFormat] = useState(
    item.metaPlacement === "story" ? "Instagram Story (9:16)" : "Instagram Post (1:1)",
  );
  const [brandStyle, setBrandStyle] = useState("Hey Ralli (Primary)");
  const [colorVibe, setColorVibe] = useState("Colorful & Playful");
  const [lightboxVersion, setLightboxVersion] = useState<ArtworkV2ReviewVersion | null>(null);

  const hasSelection = selectedVersionId != null;
  const hasComments = adjustmentComments.trim().length > 0;
  const showGeneratedOptions = showReview && versions.length > 0;

  function handleCustomizeAction(action: ArtworkCustomizeAction) {
    onCustomizeAction(action);
    if (!adjustmentComments.trim()) {
      onAdjustmentCommentsChange(CUSTOMIZE_PROMPTS[action]);
    }
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
          format={format}
          onFormatChange={setFormat}
          brandStyle={brandStyle}
          onBrandStyleChange={setBrandStyle}
          colorVibe={colorVibe}
          onColorVibeChange={setColorVibe}
          onGenerate={() => onGenerate(generationMode)}
          isGenerating={isGenerating}
          generateDisabled={!prompt.trim()}
        />

        <ArtworkInspirationUpload
          references={references}
          onReferencesChange={onReferencesChange}
          onApproveInspiration={onApproveInspiration}
          isApproving={isApprovingInspiration}
          disabled={isGenerating || isReviewBusy}
        />

        <ArtworkGenerationModeSection
          value={generationMode}
          onChange={onGenerationModeChange}
          onGenerate={() => onGenerate(generationMode)}
          isGenerating={isGenerating}
          generateDisabled={!prompt.trim()}
          disabled={isGenerating || isReviewBusy}
        />

        {showGeneratedOptions && (
          <>
            <ArtworkGeneratedOptionsGrid
              versions={versions}
              itemLabel={item.label}
              selectedVersionId={selectedVersionId}
              onSelectVersion={onSelectVersion}
              onPreviewVersion={(version) => setLightboxVersion(version)}
              onGenerateMore={onGenerateMore}
              isGeneratingMore={isGenerating || isReviewBusy}
              disabled={isReviewBusy}
            />

            <ArtworkCustomizeToolbar
              onAction={handleCustomizeAction}
              disabled={!hasSelection || isReviewBusy}
            />

            {hasSelection && (
              <div className="space-y-3 border border-cos-border bg-cos-bg/30 p-4">
                <label htmlFor="artwork-campaign-adjust" className="cos-section-title">
                  Your edits
                </label>
                <Textarea
                  id="artwork-campaign-adjust"
                  value={adjustmentComments}
                  onChange={(event) => onAdjustmentCommentsChange(event.target.value)}
                  rows={3}
                  placeholder="Describe what you'd like different — colors, layout, text, spacing…"
                  disabled={isReviewBusy}
                  className="min-h-[88px] text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isReviewBusy || !hasComments}
                    onClick={onGenerateWithEdits}
                  >
                    {isReviewBusy ? "Generating…" : "Generate with my edits"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isReviewBusy}
                    onClick={onApproveSelected}
                  >
                    {isReviewBusy ? "Saving…" : "Approve selected"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
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
