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
  MilestoneGenerationStatus,
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
  generationStatus?: MilestoneGenerationStatus;
  onClose: () => void;
  onApply: (artwork: MilestoneArtwork) => void;
  onResendForApproval?: (artwork: MilestoneArtwork) => Promise<void>;
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
  generationStatus,
  onClose,
  onApply,
  onResendForApproval,
}: EditArtworkModalProps) {
  const [instructions, setInstructions] = useState(artworkNotes ?? "");
  const [styleStrength, setStyleStrength] = useState(50);
  const [previewArtwork, setPreviewArtwork] = useState<MilestoneArtwork>(
    previewContent.artwork,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showResend =
    generationStatus === "changes_requested" && Boolean(onResendForApproval);

  async function handleRegenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
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

  async function handleResendForApproval() {
    if (!onResendForApproval) {
      return;
    }
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // Parent applies pending regenerated artwork, then resubmits for approval.
      await onResendForApproval(previewArtwork);
      setSuccessMessage("Sent for approval.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to resend for approval.",
      );
    } finally {
      setIsResending(false);
    }
  }

  const styleLabel =
    styleStrength < 35
      ? "More creative"
      : styleStrength > 65
        ? "More similar"
        : "Balanced";

  const busy = isGenerating || isResending;

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
              disabled={busy}
            />
          </div>
          <Button onClick={() => void handleRegenerate()} disabled={busy}>
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            {errorMessage ? (
              <p className="mr-auto text-sm text-red-600">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="mr-auto text-sm text-cos-success">{successMessage}</p>
            ) : null}
            <Button variant="secondary" onClick={handleApply} disabled={busy}>
              Apply artwork
            </Button>
            {showResend ? (
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => void handleResendForApproval()}
              >
                {isResending ? "Sending…" : "Resend for approval"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
