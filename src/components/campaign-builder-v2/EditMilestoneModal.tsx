"use client";

import { useMemo, useState } from "react";
import { Info, Sparkles } from "lucide-react";
import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { WarmBreathFrame } from "@/components/motion/WarmBreathFrame";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  regenerateCaptionAction,
  regenerateMilestoneArtworkAction,
} from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import { rejectArtworkView } from "@/lib/campaign-builder-v2/reject-artwork";
import { cn } from "@/lib/utils/cn";
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

function handleize(label: string | null | undefined): string {
  const trimmed = (label ?? "").trim();
  return trimmed ? trimmed.toLowerCase().replace(/\s+/g, "") : "yourcampaign";
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
  const [previewMode, setPreviewMode] = useState<"feed" | "story">("feed");
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

  const handle = handleize(inspiration.campaignName);
  const feedUrl =
    previewArtwork.feedUrl && !isPlaceholderArtworkUrl(previewArtwork.feedUrl)
      ? previewArtwork.feedUrl
      : null;
  const storyUrl =
    previewArtwork.storyUrl && !isPlaceholderArtworkUrl(previewArtwork.storyUrl)
      ? previewArtwork.storyUrl
      : null;
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

  const regenerateHint = useMemo(() => {
    if (willRegenerateArtwork && willRegenerateCaption) {
      return "Updates artwork and caption";
    }
    if (willRegenerateArtwork) return "Updates artwork only";
    if (willRegenerateCaption) return "Updates caption only";
    return "Add notes on Artwork and/or Captions";
  }, [willRegenerateArtwork, willRegenerateCaption]);

  return (
    <CampaignBuilderModal
      title="Edit Post"
      subtitle="Adjust artwork or captions, then regenerate once."
      onClose={onClose}
      size="xl"
      headerActions={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApplyAndClose}
          disabled={busy}
        >
          Apply & close
        </Button>
      }
      footer={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {tab === "artwork" ? (
              <>
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-[0.08em] text-cos-muted uppercase">
                  <span>More creative</span>
                  <span>Balanced</span>
                  <span>More similar</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={styleStrength}
                  onChange={(e) => setStyleStrength(Number(e.target.value))}
                  className="w-full accent-[var(--color-cos-success,#6b8171)]"
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
            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="text-sm text-cos-success">{successMessage}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showResend ? (
              <Button
                variant="secondary"
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
            <Button
              onClick={() => void handleRegenerate()}
              disabled={busy || !canRegenerate}
              title={regenerateHint}
              className="min-w-[11rem]"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              {isGenerating ? "Generating…" : "Regenerate with AI"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.15fr)] lg:items-start">
        {/* Live phone preview */}
        <div className="space-y-3">
          <div
            className="mx-auto inline-flex rounded-full bg-cos-bg p-1"
            role="group"
            aria-label="Preview format"
          >
            {(
              [
                ["feed", "Feed"],
                ["story", "Story"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreviewMode(id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  previewMode === id
                    ? "bg-white text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-[260px]">
            <div className="rounded-[32px] bg-[#1c2430] p-3 shadow-lg">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-[#2a3340]" />
              <div
                className={cn(
                  "overflow-hidden rounded-[22px]",
                  previewMode === "feed" ? "bg-white" : "bg-[#0f1419]",
                )}
              >
                {previewMode === "feed" ? (
                  <div>
                    <div className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-cos-text">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-cos-accent to-cos-bg" />
                        {handle}
                      </div>
                      <span className="text-cos-muted">···</span>
                    </div>
                    <WarmBreathFrame
                      active={isGenerating && willRegenerateArtwork}
                      label="Generating feed artwork"
                    >
                      <div
                        className="relative aspect-square bg-gradient-to-br from-[#2f4a3c] via-[#6b8171] to-[#d4a84b]"
                        style={
                          feedUrl
                            ? {
                                backgroundImage: `url(${feedUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        {!feedUrl ? (
                          <div className="absolute inset-x-3 bottom-3 font-display text-xl font-semibold text-white drop-shadow">
                            {milestone.name}
                          </div>
                        ) : null}
                        {feedUrl ? (
                          <button
                            type="button"
                            className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-cos-muted shadow hover:text-cos-text"
                            onClick={() => handleRejectPreview("feed")}
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </WarmBreathFrame>
                    <div className="space-y-1 px-3 py-2.5 text-[11px] leading-snug text-cos-text">
                      <div className="text-cos-muted">♡</div>
                      <p className="line-clamp-3">
                        <span className="font-bold">{handle}</span>{" "}
                        {previewCaption.trim() ||
                          "Caption appears here after you edit."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <WarmBreathFrame
                    active={isGenerating && willRegenerateArtwork}
                    label="Generating story artwork"
                  >
                    <div
                      className="relative aspect-[9/16] bg-gradient-to-b from-[#0b2f5b] via-[#2f9fb3] to-[#d4a84b]"
                      style={
                        storyUrl
                          ? {
                              backgroundImage: `url(${storyUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {!storyUrl ? (
                        <div className="absolute inset-x-4 bottom-6 font-display text-2xl font-semibold text-white drop-shadow">
                          {milestone.name}
                        </div>
                      ) : null}
                      {storyUrl ? (
                        <button
                          type="button"
                          className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-cos-muted shadow hover:text-cos-text"
                          onClick={() => handleRejectPreview("story")}
                        >
                          Reject
                        </button>
                      ) : null}
                    </div>
                  </WarmBreathFrame>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Direction controls */}
        <div className="space-y-4">
          <div className="flex gap-3 rounded-2xl border border-[rgba(107,129,113,0.35)] bg-[rgba(107,129,113,0.1)] px-4 py-3 text-sm text-[#2f4a3c]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p>
              Both Artwork notes and Captions apply when you regenerate. Leave a
              side blank if you don&apos;t want it to change.
            </p>
          </div>

          <div
            className="inline-flex rounded-full bg-cos-bg p-1"
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
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                    selected
                      ? "bg-cos-text text-white"
                      : "text-cos-muted hover:text-cos-text",
                  )}
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
                <p className="text-xs font-bold tracking-[0.08em] text-cos-muted uppercase">
                  Quick suggestions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ARTWORK_SUGGESTIONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={busy}
                      onClick={() => appendChip(setArtworkInstructions, chip)}
                      className="rounded-full border border-cos-border bg-white px-3 py-1.5 text-xs font-semibold text-cos-text transition-colors hover:bg-cos-bg"
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
                <p className="text-xs font-bold tracking-[0.08em] text-cos-muted uppercase">
                  Quick suggestions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CAPTION_SUGGESTIONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={busy}
                      onClick={() => appendChip(setCaptionInstructions, chip)}
                      className="rounded-full border border-cos-border bg-white px-3 py-1.5 text-xs font-semibold text-cos-text transition-colors hover:bg-cos-bg"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Caption"
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
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
