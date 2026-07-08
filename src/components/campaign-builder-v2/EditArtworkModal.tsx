"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { regenerateMilestoneArtworkAction } from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import { aspectClassForView } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestoneArtwork,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

const QUICK_SUGGESTIONS = [
  "More green",
  "Add kids",
  "Warmer tones",
  "Bigger headline",
  "More vintage",
  "Simpler layout",
];

interface EditArtworkModalProps {
  eventId: string;
  milestoneId: string;
  brandKitId: string | null;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  previewContent: MilestonePreviewContent;
  milestones: CampaignBuilderMilestone[];
  artworkNotes?: string;
  onClose: () => void;
  onApply: (artwork: MilestoneArtwork) => void;
}

export function EditArtworkModal({
  eventId,
  milestoneId,
  brandKitId,
  inspiration,
  milestone,
  previewContent,
  milestones,
  artworkNotes,
  onClose,
  onApply,
}: EditArtworkModalProps) {
  const [instructions, setInstructions] = useState(artworkNotes ?? "");
  const [styleStrength, setStyleStrength] = useState(50);
  const [previewArtwork, setPreviewArtwork] = useState<MilestoneArtwork>(
    previewContent.artwork,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const inspirationImages = await prepareInspirationImagesForServer(
        inspiration.inspirationImages,
      );
      const result = await regenerateMilestoneArtworkAction({
        eventId,
        milestoneId,
        instructions,
        styleStrength,
        brandKitId,
        useBrandKit: brandKitId !== null,
        inspiration,
        milestone,
        milestones,
        previewContent: {
          ...previewContent,
          artwork: previewArtwork,
        },
        inspirationImages,
      });
      if (result.success) {
        setPreviewArtwork(result.artwork);
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApply() {
    onApply(previewArtwork);
  }

  const styleLabel =
    styleStrength < 35
      ? "More creative"
      : styleStrength > 65
        ? "More similar"
        : "Balanced";

  return (
    <CampaignBuilderModal
      title="Edit artwork"
      subtitle="Regenerate feed (1:1) and story (9:16) together — describe changes below"
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-cos-muted">
              <span>More creative</span>
              <span className="font-medium text-cos-text">{styleLabel}</span>
              <span>More similar</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={styleStrength}
              onChange={(e) => setStyleStrength(Number(e.target.value))}
              className="w-full accent-cos-text"
              aria-label="Style strength"
            />
          </div>
          <Button onClick={() => void handleRegenerate()} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            {isGenerating ? "Generating…" : "Regenerate artwork"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Current artwork
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] text-cos-muted">Feed (1:1)</p>
              <ArtworkPlaceholder
                aspectClassName={aspectClassForView("feed")}
                imageUrl={previewContent.artwork.feedUrl}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-cos-muted">Story (9:16)</p>
              <ArtworkPlaceholder
                aspectClassName={aspectClassForView("story")}
                imageUrl={previewContent.artwork.storyUrl}
                className="max-h-64"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Textarea
            label="Add instructions for AI"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="e.g. More green accents, add playful school elements..."
          />

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Quick suggestions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setInstructions((prev) =>
                      prev ? `${prev}. ${chip}` : chip,
                    )
                  }
                  className="border border-cos-border bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-accent-soft"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Regenerated preview
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <ArtworkPlaceholder
                aspectClassName={aspectClassForView("feed")}
                imageUrl={previewArtwork.feedUrl}
              />
              <ArtworkPlaceholder
                aspectClassName={aspectClassForView("story")}
                imageUrl={previewArtwork.storyUrl}
                className="max-h-64"
              />
            </div>
          </div>

          <div className="flex justify-end">
            {errorMessage ? (
              <p className="mr-auto text-sm text-red-600">{errorMessage}</p>
            ) : null}
            <Button variant="secondary" onClick={handleApply}>
              Apply artwork
            </Button>
          </div>
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
