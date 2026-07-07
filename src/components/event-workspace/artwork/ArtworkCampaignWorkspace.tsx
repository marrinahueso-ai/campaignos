"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyCampaignCreativeDirection,
  CAMPAIGN_BRAND_STYLE_OPTIONS,
  CAMPAIGN_COLOR_VIBE_OPTIONS,
} from "@/lib/artwork-v2/campaign-creative-direction";
import { MilestoneScheduleBar } from "@/components/event-workspace/MilestoneScheduleBar";
import { ArtworkGeneratedOptionsGrid } from "@/components/event-workspace/artwork/ArtworkGeneratedOptionsGrid";
import { ArtworkPageHeader } from "@/components/event-workspace/artwork/ArtworkPageHeader";
import { ArtworkPromptPanel } from "@/components/event-workspace/artwork/ArtworkPromptPanel";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import {
  metaPlacementToDefaultFormatLabel,
  resolveArtworkPreviewAspectRatio,
} from "@/lib/artwork-v2/format-selection";
import { buildSetupLogoOptions } from "@/lib/artwork-v2/setup-logos";
import type { ArtworkV2Reference, ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import type { BrandAssets } from "@/types";

interface ArtworkMilestoneOption {
  relativeDay: number;
  title: string;
}

interface ArtworkCampaignWorkspaceProps {
  item: ArtworkWorkflowItem;
  milestones?: ArtworkMilestoneOption[];
  selectedRelativeDay?: number | null;
  scheduledFor?: string | null;
  onSelectMilestone?: (relativeDay: number) => void;
  prompt: string;
  format: string;
  references: ArtworkV2Reference[];
  versions: ArtworkV2ReviewVersion[];
  generationMode: ArtworkGenerationMode;
  selectedVersionId: string | null;
  brandAssets?: BrandAssets | null;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  error?: string | null;
  reviewError?: string | null;
  generationWarning?: string | null;
  onPromptChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onGenerationModeChange: (mode: ArtworkGenerationMode) => void;
  onGenerate: (mode: ArtworkGenerationMode, effectivePrompt?: string) => void;
  onSelectVersion: (versionId: string) => void;
  onApproveSelected: () => void;
  onGenerateMore: (effectivePrompt?: string) => void;
}

export function ArtworkCampaignWorkspace({
  item,
  milestones = [],
  selectedRelativeDay = null,
  scheduledFor = null,
  onSelectMilestone,
  prompt,
  format,
  references,
  versions,
  generationMode,
  selectedVersionId,
  brandAssets = null,
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
}: ArtworkCampaignWorkspaceProps) {
  const [brandStyle, setBrandStyle] = useState<string>(CAMPAIGN_BRAND_STYLE_OPTIONS[0]);
  const [colorVibe, setColorVibe] = useState<string>(CAMPAIGN_COLOR_VIBE_OPTIONS[0]);
  const [lightboxVersion, setLightboxVersion] = useState<ArtworkV2ReviewVersion | null>(null);

  const setupLogos = useMemo(() => buildSetupLogoOptions(brandAssets), [brandAssets]);

  const enrichPrompt = useCallback(
    (value: string) => applyCampaignCreativeDirection(value, brandStyle, colorVibe),
    [brandStyle, colorVibe],
  );

  const handleGenerate = useCallback(
    (mode: ArtworkGenerationMode) => {
      onGenerate(mode, enrichPrompt(prompt));
    },
    [enrichPrompt, onGenerate, prompt],
  );

  const handleGenerateMore = useCallback(() => {
    onGenerateMore(enrichPrompt(prompt));
  }, [enrichPrompt, onGenerateMore, prompt]);

  const hasSelection = selectedVersionId != null;
  const hasGeneratedVersions = versions.length > 0;
  const previewAspectRatio = resolveArtworkPreviewAspectRatio(
    item.metaPlacement === "story" ? "story" : "feed",
  );

  const showMilestoneBar =
    milestones.length > 0 &&
    selectedRelativeDay != null &&
    typeof onSelectMilestone === "function";

  return (
    <>
      <ArtworkPageHeader />

      {showMilestoneBar && (
        <MilestoneScheduleBar
          milestones={milestones}
          selectedRelativeDay={selectedRelativeDay}
          onSelectMilestone={onSelectMilestone}
          scheduledFor={scheduledFor}
          className="-mx-5 mb-5 lg:-mx-6 lg:mb-6"
        />
      )}

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
          setupLogos={setupLogos}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          isReviewBusy={isReviewBusy}
          inputsDisabled={isGenerating || isReviewBusy}
        />

        <ArtworkGeneratedOptionsGrid
          versions={versions}
          itemLabel={item.label}
          selectedVersionId={selectedVersionId}
          aspectRatio={previewAspectRatio}
          onSelectVersion={onSelectVersion}
          onPreviewVersion={(version) => setLightboxVersion(version)}
          onGenerateMore={hasGeneratedVersions ? handleGenerateMore : undefined}
          onApproveSelected={hasSelection && hasGeneratedVersions ? onApproveSelected : undefined}
          isGeneratingMore={isGenerating || isReviewBusy}
          isReviewBusy={isReviewBusy}
          disabled={isReviewBusy || !hasGeneratedVersions}
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
