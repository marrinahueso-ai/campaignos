"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Download, Trash2 } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { CompletionBanner } from "@/components/campaign-builder-v2/CompletionBanner";
import { MilestoneEmptyState } from "@/components/campaign-builder-v2/MilestoneEmptyState";
import { MilestoneRail } from "@/components/campaign-builder-v2/MilestoneRail";
import { PreviewSettingsPanel } from "@/components/campaign-builder-v2/PreviewSettingsPanel";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { ClearGeneratedContentModal } from "@/components/dev-tools/ClearGeneratedContentModal";
import { Button } from "@/components/ui/Button";
import {
  buildArtworkDownloadFilename,
  downloadArtworkImage,
} from "@/lib/artwork-v2/download";
import { brandKitIdForAi } from "@/lib/campaign-builder-v2/brand-kit";
import { syncAppliedMilestoneArtworkAction } from "@/lib/campaign-builder-v2/actions";
import {
  getSharedCaptionText,
  syncCaptionsToPlatforms,
} from "@/lib/campaign-builder-v2/caption-utils";
import {
  allMilestonesGenerated,
  captionPlatformsForFormats,
  countCompleteMilestones,
  findMilestoneAfter,
  findNextMilestoneToGenerate,
  generationStatusAfterContent,
  inferGenerationStatus,
  isMilestoneContentComplete,
  milestoneHasPartialContent,
} from "@/lib/campaign-builder-v2/milestone-status";
import {
  ARTWORK_VIEW_OPTIONS,
  artworkKeyForView,
  aspectClassForView,
  enabledArtworkViews,
  isPlaceholderArtworkUrl,
} from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";
import type {
  ArtworkView,
  PlatformFormat,
  PreviewTabId,
} from "@/lib/campaign-builder-v2/types";

const EditArtworkModal = dynamic(
  () =>
    import("@/components/campaign-builder-v2/EditArtworkModal").then((module) => ({
      default: module.EditArtworkModal,
    })),
  { ssr: false },
);

const EditCaptionModal = dynamic(
  () =>
    import("@/components/campaign-builder-v2/EditCaptionModal").then((module) => ({
      default: module.EditCaptionModal,
    })),
  { ssr: false },
);

const PREVIEW_TABS: Array<{ id: PreviewTabId; label: string }> = [
  { id: "all", label: "All Content" },
  { id: "feed", label: "Feed" },
  { id: "story", label: "Story" },
  { id: "captions", label: "Captions" },
  { id: "schedule", label: "Schedule" },
];

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

export function PreviewStep() {
  const {
    session,
    goToStep,
    setSelectedMilestoneId,
    setPreviewTab,
    updatePreviewContent,
    duplicateMilestone,
    removeMilestone,
    playbookOptions,
    generateMilestoneContent,
    generateNextMilestone,
    generatingMilestoneId,
    isGeneratingContent,
    reconcilePreviewStatuses,
    canUseDeveloperTools,
    clearMilestoneGeneratedContent,
  } = useCampaignBuilder();

  useEffect(() => {
    reconcilePreviewStatuses();
  }, [reconcilePreviewStatuses]);

  const router = useRouter();
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearSubmitting, setClearSubmitting] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [downloadingView, setDownloadingView] = useState<ArtworkView | null>(
    null,
  );

  async function handleDownloadArtwork(
    view: ArtworkView,
    imageUrl: string,
    label: string,
  ) {
    setDownloadingView(view);
    try {
      const filename = buildArtworkDownloadFilename(
        `${selectedMilestone?.name ?? "artwork"} ${label}`,
      );
      await downloadArtworkImage(imageUrl, filename);
    } catch {
      // Allow retry from the same icon.
    } finally {
      setDownloadingView(null);
    }
  }

  const selectedId =
    session.selectedMilestoneId ?? session.milestones[0]?.id ?? null;
  const selectedMilestone = session.milestones.find((m) => m.id === selectedId);
  const selectedPreview = session.previewContents.find(
    (c) => c.milestoneId === selectedId,
  );

  const progress = useMemo(
    () => countCompleteMilestones(session.milestones, session.previewContents),
    [session.milestones, session.previewContents],
  );

  const allGenerated = useMemo(
    () => allMilestonesGenerated(session.milestones, session.previewContents),
    [session.milestones, session.previewContents],
  );

  const nextToGenerate = useMemo(
    () => findNextMilestoneToGenerate(session.milestones, session.previewContents),
    [session.milestones, session.previewContents],
  );

  const selectedIsGenerating =
    generatingMilestoneId === selectedId ||
    selectedPreview?.generationStatus === "generating";

  const selectedStatus = selectedPreview
    ? inferGenerationStatus(selectedPreview, selectedPreview.enabledFormats)
    : "ready_to_generate";

  const hasCompleteContent =
    selectedPreview && selectedMilestone
      ? isMilestoneContentComplete(selectedPreview, selectedPreview.enabledFormats)
      : false;
  // Show the preview grid whenever any real artwork/caption exists. Gating on
  // full completeness hid saved feed/story images behind "No artwork yet"
  // whenever a required platform caption was missing.
  const hasPreviewableContent =
    selectedPreview != null && milestoneHasPartialContent(selectedPreview);

  const showArtwork =
    session.previewTab !== "captions" && session.previewTab !== "schedule";
  const showCaptions =
    session.previewTab === "all" || session.previewTab === "captions";
  const showScheduleTab =
    session.previewTab === "all" || session.previewTab === "schedule";

  const visibleArtworkViews =
    selectedPreview && showArtwork
      ? (artworkViewsForTab(
          session.previewTab,
          selectedPreview.enabledFormats,
        ) ?? [])
      : [];

  const sharedCaptionText = selectedPreview
    ? getSharedCaptionText(selectedPreview.captions)
    : "";

  const nextAfterSelected = selectedId
    ? findMilestoneAfter(session.milestones, selectedId)
    : null;

  const showCompletionBanner =
    hasCompleteContent &&
    !selectedIsGenerating &&
    nextAfterSelected &&
    (nextToGenerate?.id === nextAfterSelected.id ||
      selectedStatus === "needs_review" ||
      selectedStatus === "generated");

  async function handleGenerateSelected() {
    if (!selectedId) {
      return;
    }
    setGenerateError(null);
    const result = await generateMilestoneContent(selectedId);
    if (!result.success) {
      setGenerateError(result.message);
    }
  }

  async function handleGenerateNext() {
    setGenerateError(null);
    const result = await generateNextMilestone();
    if (!result.success) {
      setGenerateError(result.message);
    }
  }

  async function handleClearMilestone() {
    if (!selectedId) {
      return;
    }
    setClearSubmitting(true);
    setClearError(null);
    try {
      const result = await clearMilestoneGeneratedContent(selectedId);
      if (!result.success) {
        setClearError(result.message);
        return;
      }
      setClearMessage(
        `Cleared ${result.artworkCleared} artwork reference(s) and ${result.captionsCleared} caption(s).`,
      );
      setClearModalOpen(false);
      router.refresh();
    } finally {
      setClearSubmitting(false);
    }
  }

  const generatingName = generatingMilestoneId
    ? session.milestones.find((m) => m.id === generatingMilestoneId)?.name
    : null;

  const settingsPanelProps = selectedPreview
    ? {
        preview: selectedPreview,
        onUpdate: (patch: Parameters<typeof updatePreviewContent>[1]) =>
          updatePreviewContent(selectedPreview.milestoneId, patch),
        canUseDeveloperTools,
        onClearGeneratedContent: canUseDeveloperTools
          ? () => {
              setClearError(null);
              setClearModalOpen(true);
            }
          : undefined,
        clearMessage,
      }
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-cos-border bg-cos-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="text-sm text-cos-muted">
          <span className="font-medium text-cos-text">
            {progress.complete} of {progress.total}
          </span>{" "}
          milestones complete
        </p>
        {allGenerated ? (
          <Button size="sm" onClick={() => goToStep("review")}>
            Next: Review & Approve
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleGenerateNext}
            disabled={isGeneratingContent || !nextToGenerate}
          >
            {generatingName
              ? `Generating ${generatingName}…`
              : "Generate Next Milestone"}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <MilestoneRail
          milestones={session.milestones}
          previewContents={session.previewContents}
          selectedMilestoneId={selectedId}
          generatingMilestoneId={generatingMilestoneId}
          onSelect={setSelectedMilestoneId}
        />

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

          {selectedMilestone && selectedPreview && !hasPreviewableContent ? (
            <div className="grid flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px] lg:px-8">
              <MilestoneEmptyState
                milestoneName={selectedMilestone.name}
                isGenerating={selectedIsGenerating}
                isFailed={selectedStatus === "failed"}
                errorMessage={generateError}
                onGenerate={() => void handleGenerateSelected()}
                onGoToInspiration={() => goToStep("inspiration")}
              />
              {settingsPanelProps ? (
                <PreviewSettingsPanel {...settingsPanelProps} />
              ) : null}
            </div>
          ) : selectedMilestone && selectedPreview ? (
            <div className="grid flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px] lg:px-8">
              <div className="space-y-6">
                {showArtwork && (
                  <section className="cos-card space-y-4">
                    <h2 className="font-display text-xl text-cos-text">
                      {selectedMilestone.name}
                    </h2>

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
                        const canDownload =
                          Boolean(imageUrl) &&
                          !isPlaceholderArtworkUrl(imageUrl!);
                        const viewLabel = option?.label ?? view;

                        return (
                          <div key={view} className="space-y-2">
                            <div>
                              <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                                {viewLabel}
                              </p>
                              {option?.subtitle && (
                                <p className="text-[11px] text-cos-muted">
                                  {option.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="relative">
                              <ArtworkPlaceholder
                                aspectClassName={aspectClassForView(view)}
                                imageUrl={imageUrl}
                                alt={`${viewLabel} artwork`}
                                priority={view === "feed"}
                                className={
                                  view === "story" ? "max-h-64" : undefined
                                }
                              />
                              {canDownload ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="absolute -right-1 -top-1 z-10 h-7 w-7 p-0"
                                  disabled={downloadingView === view}
                                  onClick={() =>
                                    void handleDownloadArtwork(
                                      view,
                                      imageUrl!,
                                      viewLabel,
                                    )
                                  }
                                  aria-label={`Download ${viewLabel}`}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setArtworkModalOpen(true)}
                    >
                      Edit artwork
                    </Button>
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
                    <div className="space-y-2">
                      <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                        Facebook & Instagram
                      </p>
                      <p className="rounded border border-cos-border bg-cos-bg/50 p-4 text-sm leading-relaxed text-cos-text">
                        {sharedCaptionText || (
                          <span className="text-cos-muted">
                            No caption yet — click Edit caption to generate
                          </span>
                        )}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCaptionModalOpen(true)}
                      >
                        Edit caption
                      </Button>
                    </div>
                  </section>
                )}

                {showScheduleTab && session.previewTab === "schedule" && settingsPanelProps && (
                  <section className="cos-card lg:hidden">
                    <PreviewSettingsPanel {...settingsPanelProps} />
                  </section>
                )}
              </div>

              {session.previewTab !== "schedule" && settingsPanelProps && (
                <PreviewSettingsPanel {...settingsPanelProps} />
              )}
            </div>
          ) : (
            <p className="px-8 py-12 text-center text-cos-muted">
              Select a milestone to preview content.
            </p>
          )}
        </div>
      </div>

      {showCompletionBanner && selectedMilestone && nextAfterSelected && (
        <CompletionBanner
          completedMilestoneName={selectedMilestone.name}
          nextMilestoneName={nextAfterSelected.name}
          onGenerateNext={() => void handleGenerateNext()}
          isGenerating={isGeneratingContent}
        />
      )}

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
          // Remount per milestone — instructions/preview state is local to
          // the modal (useState from milestone-specific props), so it must
          // not persist across a different selectedMilestoneId.
          key={selectedPreview.milestoneId}
          eventId={session.eventId}
          milestoneId={selectedPreview.milestoneId}
          brandKitId={brandKitIdForAi(session.inspiration.brandKitId)}
          inspiration={session.inspiration}
          milestone={selectedMilestone}
          previewContent={selectedPreview}
          milestones={session.milestones}
          artworkNotes={selectedMilestone.artworkNotes}
          onClose={() => setArtworkModalOpen(false)}
          onApply={(artwork) => {
            updatePreviewContent(selectedPreview.milestoneId, {
              artwork,
              status: "needs-review",
              generationStatus: "needs_review",
            });
            setArtworkModalOpen(false);
            void syncAppliedMilestoneArtworkAction({
              eventId: session.eventId,
              milestones: session.milestones,
              milestoneId: selectedPreview.milestoneId,
              artwork,
            }).then(() => router.refresh());
          }}
        />
      )}

      {captionModalOpen && selectedPreview && selectedMilestone && (
        <EditCaptionModal
          key={selectedPreview.milestoneId}
          eventId={session.eventId}
          milestoneId={selectedPreview.milestoneId}
          inspiration={session.inspiration}
          milestone={selectedMilestone}
          currentCaption={sharedCaptionText}
          captionNotes={selectedMilestone.captionNotes}
          voiceTone={session.inspiration.voiceTone}
          playbookName={
            playbookOptions.find(
              (option) => option.id === session.inspiration.playbookId,
            )?.name ?? null
          }
          artworkImageUrl={
            selectedPreview.artwork.feedUrl ?? selectedPreview.artwork.storyUrl
          }
          onClose={() => setCaptionModalOpen(false)}
          onApply={(text) => {
            const captionPlatforms = (() => {
              const fromFormats = captionPlatformsForFormats(
                selectedPreview.enabledFormats,
              );
              if (fromFormats.length > 0) {
                return fromFormats;
              }
              return selectedMilestone.platforms.length > 0
                ? selectedMilestone.platforms
                : (["facebook", "instagram"] as const);
            })();
            const captions = syncCaptionsToPlatforms(text, [...captionPlatforms]);
            updatePreviewContent(selectedPreview.milestoneId, {
              captions,
              status: "ready",
              generationStatus: generationStatusAfterContent(
                { ...selectedPreview, captions },
                selectedPreview.enabledFormats,
              ),
            });
            setCaptionModalOpen(false);
          }}
        />
      )}

      <ClearGeneratedContentModal
        open={clearModalOpen}
        title="Clear This Milestone"
        isSubmitting={clearSubmitting}
        errorMessage={clearError}
        onClose={() => setClearModalOpen(false)}
        onConfirm={() => {
          void handleClearMilestone();
        }}
      />
    </div>
  );
}
