"use client";

import { useState } from "react";
import { ArrowRight, Check, Clock, Copy, Sparkles, Trash2 } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { EditArtworkModal } from "@/components/campaign-builder-v2/EditArtworkModal";
import { EditCaptionModal } from "@/components/campaign-builder-v2/EditCaptionModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { brandKitIdForAi } from "@/lib/campaign-builder-v2/brand-kit";
import { generateMilestoneArtworkAction } from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import {
  ARTWORK_VIEW_OPTIONS,
  PLATFORM_FORMAT_OPTIONS,
  artworkKeyForView,
  aspectClassForView,
  enabledArtworkViews,
  isPlaceholderArtworkUrl,
} from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";
import type {
  ArtworkView,
  MilestonePreviewContent,
  MilestonePreviewStatus,
  PlatformFormat,
  PreviewTabId,
} from "@/lib/campaign-builder-v2/types";

const PREVIEW_TABS: Array<{ id: PreviewTabId; label: string }> = [
  { id: "all", label: "All Milestones" },
  { id: "feed", label: "Feed" },
  { id: "story", label: "Story" },
  { id: "captions", label: "Captions" },
  { id: "schedule", label: "Schedule" },
];

const STATUS_ICONS: Record<
  MilestonePreviewStatus,
  { icon: typeof Check; className: string }
> = {
  ready: { icon: Check, className: "bg-cos-success text-white" },
  "needs-review": {
    icon: Clock,
    className: "bg-cos-warning text-cos-warning-text",
  },
  draft: { icon: Clock, className: "bg-cos-border text-cos-muted" },
};

const DELIVERY_OPTIONS = [
  ["auto-publish", "Publish automatically"],
  ["schedule", "Schedule to publish"],
  ["manual-email", "Email me for manual upload"],
  ["draft-only", "Save as draft only"],
] as const;

function formatScheduleDate(dateStr: string, timeStr: string): string {
  try {
    const date = new Date(`${dateStr}T${timeStr || "09:00"}:00`);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

function artworkViewsForTab(
  tab: PreviewTabId,
  enabledFormats: PlatformFormat[],
): ArtworkView[] | null {
  if (tab === "feed") {
    return ["feed"];
  }
  if (tab === "story") {
    return ["story"];
  }
  if (tab === "captions" || tab === "schedule") {
    return null;
  }
  return enabledArtworkViews(enabledFormats);
}

function milestoneHasGeneratedContent(
  preview: MilestonePreviewContent,
  artworkViews: ArtworkView[],
): boolean {
  const hasArtwork = artworkViews.some((view) => {
    const url = preview.artwork[artworkKeyForView(view)];
    return Boolean(url) && !isPlaceholderArtworkUrl(url);
  });
  const hasCaptions = preview.captions.some((caption) => caption.text.trim());
  return hasArtwork || hasCaptions;
}

export function PreviewStep() {
  const {
    session,
    goToStep,
    setSelectedMilestoneId,
    setPreviewTab,
    updatePreviewContent,
    updateInspiration,
    duplicateMilestone,
    removeMilestone,
  } = useCampaignBuilder();

  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [artworkView, setArtworkView] = useState<ArtworkView>("feed");
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [captionPlatform, setCaptionPlatform] = useState<"facebook" | "instagram">(
    "facebook",
  );
  const [isGeneratingArtwork, setIsGeneratingArtwork] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  const selectedId =
    session.selectedMilestoneId ?? session.milestones[0]?.id ?? null;
  const selectedMilestone = session.milestones.find((m) => m.id === selectedId);
  const selectedPreview = session.previewContents.find(
    (c) => c.milestoneId === selectedId,
  );

  const showArtwork =
    session.previewTab !== "captions" && session.previewTab !== "schedule";
  const showCaptions =
    session.previewTab === "all" || session.previewTab === "captions";
  const showSchedule =
    session.previewTab === "all" || session.previewTab === "schedule";

  const visibleArtworkViews =
    selectedPreview && showArtwork
      ? (artworkViewsForTab(
          session.previewTab,
          selectedPreview.enabledFormats,
        ) ?? [])
      : [];

  const allArtworkViews =
    selectedPreview && selectedMilestone
      ? enabledArtworkViews(selectedPreview.enabledFormats)
      : [];

  const hasGeneratedContent =
    selectedPreview && selectedMilestone
      ? milestoneHasGeneratedContent(selectedPreview, allArtworkViews)
      : false;

  const hasManualIgStory = selectedPreview?.enabledFormats.includes(
    "instagram-story-manual",
  );

  function toggleFormat(format: PlatformFormat, enabled: boolean) {
    if (!selectedPreview) {
      return;
    }
    const enabledFormats = enabled
      ? [...selectedPreview.enabledFormats, format]
      : selectedPreview.enabledFormats.filter((f) => f !== format);
    updatePreviewContent(selectedPreview.milestoneId, { enabledFormats });
  }

  async function handleGenerateMilestoneArtwork() {
    if (!selectedMilestone || !selectedPreview) {
      return;
    }

    setIsGeneratingArtwork(true);
    setArtworkError(null);

    try {
      const brandKitId = brandKitIdForAi(session.inspiration.brandKitId);
      const inspirationImages = await prepareInspirationImagesForServer(
        session.inspiration.inspirationImages,
      );
      const result = await generateMilestoneArtworkAction({
        eventId: session.eventId,
        milestoneId: selectedPreview.milestoneId,
        inspiration: session.inspiration,
        milestone: selectedMilestone,
        previewContent: selectedPreview,
        brandKitId,
        useBrandKit: brandKitId !== null,
        inspirationImages,
      });

      if (!result.success) {
        setArtworkError(result.message);
        return;
      }

      updatePreviewContent(selectedPreview.milestoneId, {
        artwork: result.artwork,
        status: "needs-review",
      });

      if (result.updatedInspiration) {
        updateInspiration(result.updatedInspiration);
      }
    } catch (error) {
      setArtworkError(
        error instanceof Error ? error.message : "Could not generate artwork.",
      );
    } finally {
      setIsGeneratingArtwork(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end border-b border-cos-border bg-cos-card px-4 py-3 lg:px-8">
        <Button size="sm" onClick={() => goToStep("review")}>
          Next: Review & Approve
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-cos-border bg-cos-card lg:block">
          <ul className="divide-y divide-cos-border">
            {session.milestones
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((milestone) => {
                const preview = session.previewContents.find(
                  (c) => c.milestoneId === milestone.id,
                );
                const status = preview?.status ?? "draft";
                const StatusIcon = STATUS_ICONS[status].icon;
                const isSelected = milestone.id === selectedId;

                return (
                  <li key={milestone.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneId(milestone.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-cos-accent-soft/60 text-cos-text"
                          : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          STATUS_ICONS[status].className,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                      <span className="truncate font-medium">{milestone.name}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-cos-border bg-cos-card px-4 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-3">
              {PREVIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewTab(tab.id)}
                  className={cn(
                    "shrink-0 px-4 py-2 text-sm font-medium transition-colors",
                    session.previewTab === tab.id
                      ? "border-b-2 border-cos-text text-cos-text"
                      : "text-cos-muted hover:text-cos-text",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {selectedMilestone && selectedPreview && !hasGeneratedContent ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16">
              <div className="w-full max-w-md">
                <ArtworkPlaceholder aspectClassName="aspect-square" />
              </div>
              <div className="max-w-sm text-center">
                <p className="font-display text-xl text-cos-text">
                  No content yet
                </p>
                <p className="mt-2 text-sm text-cos-muted">
                  Generate artwork and captions from the Milestones page, then
                  review each milestone here.
                </p>
              </div>
              <Button onClick={() => goToStep("milestones")}>
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                Generate Content
              </Button>
            </div>
          ) : selectedMilestone && selectedPreview ? (
            <div className="grid flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px] lg:px-8">
              <div className="space-y-6">
                {showArtwork && (
                  <section className="cos-card space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl text-cos-text">
                        {selectedMilestone.name}
                      </h2>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isGeneratingArtwork}
                        onClick={() => void handleGenerateMilestoneArtwork()}
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                        {isGeneratingArtwork ? "Generating…" : "Generate"}
                      </Button>
                    </div>

                    {artworkError && (
                      <p
                        className="rounded border border-cos-warning/40 bg-cos-warning/10 px-3 py-2 text-sm text-cos-warning-text"
                        role="alert"
                      >
                        {artworkError}
                      </p>
                    )}

                    {selectedMilestone.artworkNotes && (
                      <p className="text-xs text-cos-muted">
                        Artwork notes: {selectedMilestone.artworkNotes}
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      {visibleArtworkViews.map((view) => {
                        const option = ARTWORK_VIEW_OPTIONS.find(
                          (entry) => entry.id === view,
                        );
                        const artworkKey = artworkKeyForView(view);
                        const imageUrl = selectedPreview.artwork[artworkKey];

                        return (
                          <div key={view} className="space-y-2">
                            <div>
                              <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                                {option?.label ?? view}
                              </p>
                              {option?.subtitle && (
                                <p className="text-[11px] text-cos-muted">
                                  {option.subtitle}
                                </p>
                              )}
                            </div>
                            <ArtworkPlaceholder
                              aspectClassName={aspectClassForView(view)}
                              imageUrl={imageUrl}
                              className={
                                view === "story" ? "max-h-64" : undefined
                              }
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setArtworkView(view);
                                setArtworkModalOpen(true);
                              }}
                            >
                              Edit artwork
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {showCaptions && (
                  <section className="cos-card space-y-4">
                    <h2 className="font-display text-xl text-cos-text">Captions</h2>
                    {selectedMilestone.captionNotes && (
                      <p className="text-xs text-cos-muted">
                        Caption notes: {selectedMilestone.captionNotes}
                      </p>
                    )}
                    {selectedPreview.captions.map((caption) => (
                      <div key={caption.platform} className="space-y-2">
                        <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                          {caption.platform === "facebook"
                            ? "Facebook"
                            : "Instagram"}
                        </p>
                        <p className="rounded border border-cos-border bg-cos-bg/50 p-4 text-sm leading-relaxed text-cos-text">
                          {caption.text || (
                            <span className="text-cos-muted">
                              No caption yet — click Edit caption to generate
                            </span>
                          )}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCaptionPlatform(caption.platform);
                            setCaptionModalOpen(true);
                          }}
                        >
                          Edit caption
                        </Button>
                      </div>
                    ))}
                  </section>
                )}
              </div>

              {showSchedule && (
                <aside className="cos-card h-fit space-y-5">
                  <h2 className="font-display text-xl text-cos-text">Settings</h2>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                      Platforms
                    </legend>
                    {PLATFORM_FORMAT_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPreview.enabledFormats.includes(
                            option.id,
                          )}
                          onChange={(e) =>
                            toggleFormat(option.id, e.target.checked)
                          }
                          className="h-4 w-4 accent-cos-text"
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                      Delivery method
                    </legend>
                    {DELIVERY_OPTIONS.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="delivery"
                          checked={selectedPreview.deliveryMethod === value}
                          onChange={() =>
                            updatePreviewContent(selectedPreview.milestoneId, {
                              deliveryMethod: value,
                            })
                          }
                          className="h-4 w-4 accent-cos-text"
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>

                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                      Schedule
                    </p>
                    <Input
                      type="date"
                      value={selectedPreview.scheduleDate}
                      onChange={(e) =>
                        updatePreviewContent(selectedPreview.milestoneId, {
                          scheduleDate: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="time"
                      value={selectedPreview.scheduleTime}
                      onChange={(e) =>
                        updatePreviewContent(selectedPreview.milestoneId, {
                          scheduleTime: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-medium text-cos-accent transition-colors hover:text-cos-text"
                    >
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Auto-suggest best time
                    </button>
                    <p className="text-xs text-cos-muted">
                      {formatScheduleDate(
                        selectedPreview.scheduleDate,
                        selectedPreview.scheduleTime,
                      )}
                    </p>
                  </div>

                  {(hasManualIgStory ||
                    selectedPreview.deliveryMethod === "manual-email") && (
                    <div className="space-y-2 border-t border-cos-border pt-4">
                      <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                        Email send time (manual upload)
                      </p>
                      <p className="text-xs text-cos-muted">
                        Defaults to publish time. Updates when publish schedule
                        changes.
                      </p>
                      <Input
                        type="date"
                        value={selectedPreview.emailSendDate}
                        onChange={(e) =>
                          updatePreviewContent(selectedPreview.milestoneId, {
                            emailSendDate: e.target.value,
                          })
                        }
                      />
                      <Input
                        type="time"
                        value={selectedPreview.emailSendTime}
                        onChange={(e) =>
                          updatePreviewContent(selectedPreview.milestoneId, {
                            emailSendTime: e.target.value,
                          })
                        }
                      />
                      <Input
                        label="Send to"
                        value={selectedPreview.manualEmailTo}
                        onChange={(e) =>
                          updatePreviewContent(selectedPreview.milestoneId, {
                            manualEmailTo: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </aside>
              )}
            </div>
          ) : (
            <p className="px-8 py-12 text-center text-cos-muted">
              Select a milestone to preview content.
            </p>
          )}
        </div>
      </div>

      <CampaignBuilderFooter
        onBack={() => goToStep("milestones")}
        backLabel="Back to Milestones"
        showContinue={false}
        showBack
        leftActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedId}
              onClick={() => selectedId && duplicateMilestone(selectedId)}
            >
              <Copy className="h-4 w-4" strokeWidth={1.5} />
              Duplicate milestone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedId}
              onClick={() => selectedId && removeMilestone(selectedId)}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              Delete milestone
            </Button>
          </>
        }
      />

      {artworkModalOpen && selectedPreview && selectedMilestone && (
        <EditArtworkModal
          eventId={session.eventId}
          milestoneId={selectedPreview.milestoneId}
          view={artworkView}
          brandKitId={brandKitIdForAi(session.inspiration.brandKitId)}
          inspiration={session.inspiration}
          milestone={selectedMilestone}
          currentImageUrl={
            selectedPreview.artwork[artworkKeyForView(artworkView)]
          }
          artworkNotes={selectedMilestone.artworkNotes}
          onClose={() => setArtworkModalOpen(false)}
          onApply={(imageUrl) => {
            const key = artworkKeyForView(artworkView);
            updatePreviewContent(selectedPreview.milestoneId, {
              artwork: {
                ...selectedPreview.artwork,
                [key]: imageUrl,
              },
              status: "needs-review",
            });
            setArtworkModalOpen(false);
          }}
        />
      )}

      {captionModalOpen && selectedPreview && selectedMilestone && (
        <EditCaptionModal
          eventId={session.eventId}
          milestoneId={selectedPreview.milestoneId}
          platform={captionPlatform}
          inspiration={session.inspiration}
          milestone={selectedMilestone}
          currentCaption={
            selectedPreview.captions.find((c) => c.platform === captionPlatform)
              ?.text ?? ""
          }
          captionNotes={selectedMilestone.captionNotes}
          voiceTone={session.inspiration.voiceTone}
          artworkImageUrl={
            selectedPreview.artwork.feedUrl ?? selectedPreview.artwork.storyUrl
          }
          onClose={() => setCaptionModalOpen(false)}
          onApply={(text) => {
            updatePreviewContent(selectedPreview.milestoneId, {
              captions: selectedPreview.captions.map((c) =>
                c.platform === captionPlatform ? { ...c, text } : c,
              ),
              status: "needs-review",
            });
            setCaptionModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
