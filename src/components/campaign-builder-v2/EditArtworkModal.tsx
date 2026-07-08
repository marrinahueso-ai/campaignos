"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { regenerateArtworkAction } from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import {
  ARTWORK_VIEW_LABELS,
  aspectClassForView,
} from "@/lib/campaign-builder-v2/platform-utils";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";
import { cn } from "@/lib/utils/cn";

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
  view: ArtworkView;
  brandKitId: string | null;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  currentImageUrl: string | null;
  artworkNotes?: string;
  onClose: () => void;
  onApply: (imageUrl: string) => void;
}

export function EditArtworkModal({
  eventId,
  milestoneId,
  view,
  brandKitId,
  inspiration,
  milestone,
  currentImageUrl,
  artworkNotes,
  onClose,
  onApply,
}: EditArtworkModalProps) {
  const [instructions, setInstructions] = useState(artworkNotes ?? "");
  const [styleStrength, setStyleStrength] = useState(50);
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const inspirationImages = await prepareInspirationImagesForServer(
        inspiration.inspirationImages,
      );
      const result = await regenerateArtworkAction({
        eventId,
        milestoneId,
        view,
        instructions,
        styleStrength,
        brandKitId,
        useBrandKit: brandKitId !== null,
        inspiration,
        milestone,
        currentImageUrl,
        inspirationImages,
      });
      if (result.success) {
        setVariations(result.variationUrls);
        setSelectedVariation(0);
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApply() {
    const imageUrl =
      selectedVariation !== null && variations[selectedVariation]
        ? variations[selectedVariation]
        : currentImageUrl ?? variations[0] ?? "";
    if (imageUrl) {
      onApply(imageUrl);
    }
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
      subtitle={`${ARTWORK_VIEW_LABELS[view]} — describe changes and regenerate`}
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
          <Button onClick={handleRegenerate} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            {isGenerating ? "Generating…" : "Regenerate artwork"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Current artwork
          </p>
          <ArtworkPlaceholder
            aspectClassName={aspectClassForView(view)}
            imageUrl={currentImageUrl}
          />
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
              Variations
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(variations.length > 0 ? variations : [null, null, null, null]).map(
                (url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => url && setSelectedVariation(index)}
                    className={cn(
                      "overflow-hidden border-2 transition-colors",
                      selectedVariation === index
                        ? "border-cos-text"
                        : "border-cos-border hover:border-cos-accent",
                    )}
                  >
                    <ArtworkPlaceholder
                      aspectClassName={aspectClassForView(view)}
                      imageUrl={url}
                    />
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex justify-end">
            {errorMessage ? (
              <p className="mr-auto text-sm text-red-600">{errorMessage}</p>
            ) : null}
            <Button variant="secondary" onClick={handleApply}>
              Apply selected
            </Button>
          </div>
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
