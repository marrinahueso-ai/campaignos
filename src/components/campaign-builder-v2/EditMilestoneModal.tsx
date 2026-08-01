"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  regenerateCaptionAction,
  regenerateMilestoneArtworkAction,
} from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import { aspectClassForView } from "@/lib/campaign-builder-v2/platform-utils";
import { rejectArtworkView } from "@/lib/campaign-builder-v2/reject-artwork";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestoneArtwork,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

export type EditMilestoneTab = "artwork" | "captions";

const ARTWORK_SUGGESTIONS = [
  "More green",
  "Add people",
  "Warmer tones",
  "Bigger headline",
  "More vintage",
  "Simpler layout",
];

const CAPTION_SUGGESTIONS = [
  "Shorter",
  "More excited",
  "Add emoji",
  "Include CTA",
  "Warmer tone",
  "Add date",
];

interface EditMilestoneModalProps {
  eventId: string;
  milestoneId: string;
  brandKitId: string | null;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  previewContent: MilestonePreviewContent;
  milestones: CampaignBuilderMilestone[];
  currentCaption: string;
  artworkNotes?: string;
  captionNotes?: string;
  voiceTone: string;
  playbookName?: string | null;
  artworkImageUrl?: string | null;
  generationStatus?: MilestoneGenerationStatus;
  initialTab?: EditMilestoneTab;
  onClose: () => void;
  onApplyArtwork: (artwork: MilestoneArtwork) => void;
  onApplyCaption: (text: string, options?: { close?: boolean }) => void;
  onResendForApproval?: (artwork: MilestoneArtwork) => Promise<void>;
}

export function EditMilestoneModal({
  eventId,
  milestoneId,
  brandKitId,
  inspiration,
  milestone,
  previewContent,
  milestones,
  currentCaption,
  artworkNotes,
  captionNotes,
  voiceTone,
  playbookName,
  artworkImageUrl,
  generationStatus,
  initialTab = "artwork",
  onClose,
  onApplyArtwork,
  onApplyCaption,
  onResendForApproval,
}: EditMilestoneModalProps) {
  const [tab, setTab] = useState<EditMilestoneTab>(initialTab);
  const [artworkInstructions, setArtworkInstructions] = useState(
    artworkNotes ?? "",
  );
  const [captionInstructions, setCaptionInstructions] = useState(
    captionNotes ?? "",
  );
  const [styleStrength, setStyleStrength] = useState(50);
  const [tone, setTone] = useState(voiceTone);
  const [previewArtwork, setPreviewArtwork] = useState<MilestoneArtwork>(
    previewContent.artwork,
  );
  const [previewCaption, setPreviewCaption] = useState(currentCaption);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showResend =
    Boolean(onResendForApproval) &&
    (generationStatus === "changes_requested" ||
      generationStatus === "awaiting_approval");

  const willRegenerateArtwork = artworkInstructions.trim().length > 0;
  const willRegenerateCaption = captionInstructions.trim().length > 0;
  const canRegenerate = willRegenerateArtwork || willRegenerateCaption;

  const styleLabel =
    styleStrength < 35
      ? "More creative"
      : styleStrength > 65
        ? "More similar"
        : "Balanced";

  const regenerateLabel = useMemo(() => {
    if (willRegenerateArtwork && willRegenerateCaption) {
      return "Regenerate both";
    }
    if (willRegenerateArtwork) return "Regenerate artwork";
    if (willRegenerateCaption) return "Regenerate caption";
    return "Regenerate";
  }, [willRegenerateArtwork, willRegenerateCaption]);

  const busy = isGenerating || isResending;

  async function handleRegenerate() {
    if (!canRegenerate) {
      setErrorMessage(
        "Add instructions on Artwork and/or Captions — leave a side blank to skip it.",
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const parts: string[] = [];
    const errors: string[] = [];

    try {
      if (willRegenerateArtwork) {
        const inspirationImages = await prepareInspirationImagesForServer(
          inspiration.inspirationImages,
        );
        const result = await regenerateMilestoneArtworkAction({
          eventId,
          milestoneId,
          instructions: artworkInstructions,
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
          parts.push("artwork");
        } else {
          errors.push(result.message);
        }
      }

      if (willRegenerateCaption) {
        const result = await regenerateCaptionAction({
          eventId,
          milestoneId,
          platform: milestone.platforms[0] ?? "facebook",
          instructions: captionInstructions,
          tone,
          currentCaption: previewCaption || currentCaption,
          inspiration,
          milestone,
          artworkImageUrl:
            artworkImageUrl ??
            previewArtwork.feedUrl ??
            previewArtwork.storyUrl ??
            null,
          playbookName: playbookName ?? null,
        });
        if (result.success) {
          setPreviewCaption(result.caption);
          onApplyCaption(result.caption, { close: false });
          parts.push("caption");
        } else {
          errors.push(result.message);
        }
      }

      if (errors.length > 0) {
        setErrorMessage(errors.join(" "));
      }
      if (parts.length > 0) {
        setSuccessMessage(
          parts.length === 2
            ? "Artwork and caption updated."
            : parts[0] === "artwork"
              ? "Artwork updated — Apply to keep it."
              : "Caption saved.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApplyAndClose() {
    onApplyArtwork(previewArtwork);
    onApplyCaption(previewCaption, { close: false });
    onClose();
  }

  function handleRejectPreview(view: ArtworkView) {
    setPreviewArtwork((prev) => rejectArtworkView(prev, view));
  }

  async function handleResendForApproval() {
    if (!onResendForApproval) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      onApplyArtwork(previewArtwork);
      onApplyCaption(previewCaption, { close: false });
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

  function appendChip(
    setter: (fn: (prev: string) => string) => void,
    chip: string,
  ) {
    setter((prev) => (prev ? `${prev}. ${chip}` : chip));
  }

  return (
    <CampaignBuilderModal
      title="Edit"
      subtitle="Adjust artwork or captions, then regenerate once."
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-2">
            {tab === "artwork" ? (
              <>
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
              </>
            ) : (
              <p className="text-xs text-cos-muted">
                Leave Artwork blank to skip images. Leave Captions blank to skip
                the caption.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Back to Preview
            </Button>
            <Button
              onClick={() => void handleRegenerate()}
              disabled={busy || !canRegenerate}
              title={
                canRegenerate
                  ? undefined
                  : "Add instructions on Artwork and/or Captions"
              }
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              {isGenerating ? "Generating…" : regenerateLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded border border-cos-border bg-cos-bg/60 px-4 py-3 text-sm text-cos-muted">
          Uses your current feed and story. Artwork notes and Captions both apply
          when you regenerate — leave a side blank to skip it.
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Current artwork
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] text-cos-muted">Feed (1:1)</p>
                <ArtworkPlaceholder
                  aspectClassName={aspectClassForView("feed")}
                  imageUrl={
                    previewArtwork.feedUrl || previewContent.artwork.feedUrl
                  }
                  isGenerating={isGenerating && willRegenerateArtwork}
                  onReject={
                    previewArtwork.feedUrl
                      ? () => handleRejectPreview("feed")
                      : undefined
                  }
                  rejectLabel="Reject feed image"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-cos-muted">Story (9:16)</p>
                <ArtworkPlaceholder
                  aspectClassName={aspectClassForView("story")}
                  imageUrl={
                    previewArtwork.storyUrl || previewContent.artwork.storyUrl
                  }
                  className="max-h-64"
                  isGenerating={isGenerating && willRegenerateArtwork}
                  onReject={
                    previewArtwork.storyUrl
                      ? () => handleRejectPreview("story")
                      : undefined
                  }
                  rejectLabel="Reject story image"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="inline-flex rounded-full border border-cos-border bg-cos-bg p-1"
              role="tablist"
              aria-label="Edit mode"
            >
              {(
                [
                  ["artwork", "Artwork"],
                  ["captions", "Captions"],
                ] as const
              ).map(([id, label]) => {
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    disabled={busy}
                    onClick={() => setTab(id)}
                    className={
                      selected
                        ? "rounded-full bg-cos-text px-4 py-1.5 text-sm font-medium text-white"
                        : "rounded-full px-4 py-1.5 text-sm font-medium text-cos-muted hover:text-cos-text"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {tab === "artwork" ? (
              <div role="tabpanel" className="space-y-4">
                <Textarea
                  label="What should change?"
                  value={artworkInstructions}
                  onChange={(e) => setArtworkInstructions(e.target.value)}
                  rows={5}
                  placeholder="e.g. More green accents, add playful community elements…"
                  disabled={busy}
                />
                <div>
                  <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                    Quick suggestions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ARTWORK_SUGGESTIONS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          appendChip(setArtworkInstructions, chip)
                        }
                        className="border border-cos-border bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-accent-soft"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div role="tabpanel" className="space-y-4">
                <Textarea
                  label="Saved caption"
                  value={currentCaption}
                  readOnly
                  rows={3}
                  className="bg-cos-bg/50"
                />
                <Textarea
                  label="What should change?"
                  value={captionInstructions}
                  onChange={(e) => setCaptionInstructions(e.target.value)}
                  rows={4}
                  placeholder="e.g. Make it shorter and more excited…"
                  disabled={busy}
                />
                <Select
                  label="Tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={busy}
                >
                  <option value={voiceTone || "Campaign default"}>
                    {voiceTone || "Campaign default (None)"}
                  </option>
                  <option value="Friendly, Exciting, Welcoming">
                    Friendly, Exciting, Welcoming
                  </option>
                  <option value="Professional, Informative">
                    Professional, Informative
                  </option>
                  <option value="Playful, Energetic">Playful, Energetic</option>
                </Select>
                <div>
                  <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                    Quick suggestions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CAPTION_SUGGESTIONS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          appendChip(setCaptionInstructions, chip)
                        }
                        className="border border-cos-border bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-accent-soft"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  label="Preview caption"
                  value={previewCaption}
                  onChange={(e) => {
                    setPreviewCaption(e.target.value);
                    setSuccessMessage(null);
                  }}
                  rows={4}
                  disabled={busy}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {errorMessage ? (
                <p className="mr-auto text-sm text-red-600">{errorMessage}</p>
              ) : null}
              {successMessage ? (
                <p className="mr-auto text-sm text-cos-success">{successMessage}</p>
              ) : null}
              <Button
                variant="secondary"
                onClick={handleApplyAndClose}
                disabled={busy}
              >
                Apply & close
              </Button>
              {showResend ? (
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => void handleResendForApproval()}
                >
                  {isResending
                    ? "Sending…"
                    : generationStatus === "changes_requested"
                      ? "Send for re-approval"
                      : "Resend for approval"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
