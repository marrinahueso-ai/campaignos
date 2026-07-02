"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CanvaDesignPicker } from "@/components/canva/CanvaDesignPicker";
import { ArtworkV2ApprovedScreen } from "@/components/artwork-v2/ArtworkV2ApprovedScreen";
import { ArtworkV2CreatorScreen } from "@/components/artwork-v2/ArtworkV2CreatorScreen";
import {
  ArtworkV2PickerScreen,
  type ArtworkV2PickerEntry,
} from "@/components/artwork-v2/ArtworkV2PickerScreen";
import { ArtworkV2ReviewScreen } from "@/components/artwork-v2/ArtworkV2ReviewScreen";
import {
  adjustArtworkV2Action,
  approveArtworkV2Action,
  approveInspirationAsArtworkV2Action,
  denyArtworkV2Action,
  generateArtworkV2Action,
  generateStoryFromFeedAction,
  importCanvaDesignAsArtworkV2Action,
} from "@/lib/artwork-v2/actions";
import { getCanvaConnectionStatusAction } from "@/lib/canva/actions";
import {
  getApprovedArtworkAssets,
  isApprovedArtworkAsset,
  pickDefaultInspirationAsset,
  type ArtworkPhaseWorkflowItem,
} from "@/lib/artwork-v2/campaign-phases";
import { buildDefaultArtworkPrompt } from "@/lib/artwork-v2/event-prompt";
import { resolveCanvaUrl } from "@/lib/artwork-v2/canva-link";
import {
  findMilestoneFeedItem,
  findMilestoneStoryItem,
  nextMilestoneFeedItem,
} from "@/lib/artwork-v2/milestone-workflow";
import { getArtworkWorkflowItems } from "@/lib/creative-studio/artwork-defaults";
import { nextWorkflowItem, resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import type { ArtworkV2Reference, ArtworkV2ReviewVersion, ArtworkV2Step } from "@/lib/artwork-v2/types";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import { buildArtworkDownloadFilename } from "@/lib/artwork-v2/download";
import type { ArtworkV2ApprovedFormat } from "@/components/artwork-v2/ArtworkV2ApprovedScreen";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { Event } from "@/types";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";

interface ArtworkV2ShellProps {
  eventId: string;
  event: Event;
  organizationName?: string | null;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  communicationSteps: EventCommunicationStep[];
  assets: EventAsset[];
}

function revokeReferencePreviews(references: ArtworkV2Reference[]): void {
  for (const reference of references) {
    if (reference.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(reference.previewUrl);
    }
  }
}

function appendReferencesToFormData(formData: FormData, references: ArtworkV2Reference[]): void {
  for (const reference of references) {
    if (reference.source === "event_file" && reference.eventAssetId) {
      formData.append("inspirationEventAssetId", reference.eventAssetId);
    }

    if (reference.source === "upload" && reference.file) {
      formData.append("inspirationFile", reference.file);
    }
  }
}

function isPhaseItem(item: ArtworkWorkflowItem): item is ArtworkPhaseWorkflowItem {
  return typeof item.relativeDay === "number";
}

function referenceFromApprovedAsset(asset: EventAsset): ArtworkV2Reference {
  return {
    id: crypto.randomUUID(),
    source: "event_file",
    label: asset.planLabel ?? asset.filename ?? "Approved artwork",
    previewUrl: resolveAssetImageUrl(asset.storagePath),
    eventAssetId: asset.id,
  };
}

function resolveApprovedDownload(
  item: ArtworkWorkflowItem,
  assets: EventAsset[],
): { imageUrl: string; downloadFilename: string } | null {
  const asset = resolveWorkflowAsset(item, null, assets);
  if (!isApprovedArtworkAsset(asset) || !asset?.storagePath) {
    return null;
  }

  const imageUrl = resolveAssetImageUrl(asset.storagePath);
  if (!imageUrl) {
    return null;
  }

  return {
    imageUrl,
    downloadFilename: buildArtworkDownloadFilename(item.label),
  };
}

function buildCreatorDefaults(
  item: ArtworkWorkflowItem,
  phaseItems: ArtworkPhaseWorkflowItem[],
  assets: EventAsset[],
  event: Event,
  organizationName?: string | null,
): { prompt: string; references: ArtworkV2Reference[] } {
  const inspirationAsset = isPhaseItem(item)
    ? pickDefaultInspirationAsset(phaseItems, item, assets)
    : null;
  const references = inspirationAsset ? [referenceFromApprovedAsset(inspirationAsset)] : [];

  return {
    prompt: buildDefaultArtworkPrompt({
      event,
      organizationName,
      item,
      hasInspiration: references.length > 0,
    }),
    references,
  };
}

export function ArtworkV2Shell({
  eventId,
  event,
  organizationName = null,
  eventType,
  communicationStrategy,
  communicationSteps,
  assets,
}: ArtworkV2ShellProps) {
  const router = useRouter();
  const workflowItems = useMemo(
    () =>
      getArtworkWorkflowItems({
        eventType,
        communicationStrategy,
        communicationSteps,
        assets,
      }),
    [eventType, communicationStrategy, communicationSteps, assets],
  );

  const phaseItems = useMemo(
    () => workflowItems.filter(isPhaseItem),
    [workflowItems],
  );

  const approvedArtworkAssets = useMemo(
    () => getApprovedArtworkAssets(assets),
    [assets],
  );

  const canvaUrl = useMemo(() => resolveCanvaUrl(assets), [assets]);

  const pickerItems = useMemo<ArtworkV2PickerEntry[]>(
    () =>
      workflowItems.map((item) => {
        const asset = resolveWorkflowAsset(item, null, assets);
        const approved = isApprovedArtworkAsset(asset);
        const downloadUrl =
          approved && asset?.storagePath ? resolveAssetImageUrl(asset.storagePath) : null;

        return {
          ...item,
          isApproved: approved,
          downloadUrl,
          downloadFilename: buildArtworkDownloadFilename(item.label),
        };
      }),
    [workflowItems, assets],
  );

  const [step, setStep] = useState<ArtworkV2Step>("pick");
  const [selectedItem, setSelectedItem] = useState<ArtworkWorkflowItem | null>(null);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ArtworkV2Reference[]>([]);
  const [approvedArtwork, setApprovedArtwork] = useState<{
    imageUrl: string;
    downloadFilename: string;
  } | null>(null);
  const [reviewVersions, setReviewVersions] = useState<ArtworkV2ReviewVersion[]>([]);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [milestoneFormats, setMilestoneFormats] = useState<ArtworkV2ApprovedFormat[] | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [canvaPickerOpen, setCanvaPickerOpen] = useState(false);
  const [importingCanvaDesignId, setImportingCanvaDesignId] = useState<string | null>(null);
  const [canvaStatus, setCanvaStatus] = useState({ configured: false, connected: false });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const [lastGenerationMode, setLastGenerationMode] = useState<ArtworkGenerationMode>("quick");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isReviewBusy, startReviewAction] = useTransition();

  useEffect(() => {
    void getCanvaConnectionStatusAction().then(setCanvaStatus);
  }, []);

  const canImportFromCanva = canvaStatus.configured && canvaStatus.connected;

  function buildCanvaConnectHref() {
    if (typeof window === "undefined") {
      return "/api/canva/oauth/start?returnTo=/settings/canva";
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return `/api/canva/oauth/start?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function openItem(item: ArtworkWorkflowItem) {
    setSelectedItem(item);
    setMilestoneFormats(null);
    setGenerationError(null);
    setGenerationWarning(null);
    setReviewError(null);
    setIsGeneratingStory(false);

    const approvedDownload = resolveApprovedDownload(item, assets);
    if (approvedDownload) {
      setApprovedArtwork(approvedDownload);
      setStep("approved");
      return;
    }

    setApprovedArtwork(null);
    const defaults = buildCreatorDefaults(item, phaseItems, assets, event, organizationName);
    setPrompt(defaults.prompt);
    setReferences(defaults.references);
    setStep("create");
  }

  async function finishApprovedArtworkImport(imageUrl: string | null) {
    if (!selectedItem) return;

    if (imageUrl) {
      setApprovedArtwork({
        imageUrl,
        downloadFilename: buildArtworkDownloadFilename(selectedItem.label),
      });
    }

    router.refresh();

    if (isPhaseItem(selectedItem) && selectedItem.metaPlacement === "story") {
      openMilestoneApproved(selectedItem.relativeDay);
      return;
    }

    setStep("approved");
  }

  function handleImportCanvaDesign(designId: string) {
    if (!selectedItem) return;

    setGenerationError(null);
    setImportingCanvaDesignId(designId);

    startReviewAction(async () => {
      const result = await importCanvaDesignAsArtworkV2Action(
        eventId,
        selectedItem.id,
        designId,
      );

      setImportingCanvaDesignId(null);

      if (!result.success) {
        setGenerationError(result.error ?? "Unable to import from Canva.");
        return;
      }

      setCanvaPickerOpen(false);
      await finishApprovedArtworkImport(result.approvedImageUrl ?? null);
    });
  }

  function openMilestoneApproved(relativeDay: number) {
    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
    if (!feedItem) return;

    const feedDownload = resolveApprovedDownload(feedItem, assets);
    const storyDownload = storyItem ? resolveApprovedDownload(storyItem, assets) : null;

    setSelectedItem(feedItem);
    setMilestoneFormats([
      {
        label: "Feed 1:1",
        imageUrl: feedDownload?.imageUrl ?? null,
        downloadFilename: feedDownload?.downloadFilename ?? buildArtworkDownloadFilename(feedItem.label),
      },
      {
        label: "Story 9:16",
        imageUrl: storyDownload?.imageUrl ?? null,
        downloadFilename:
          storyDownload?.downloadFilename ??
          buildArtworkDownloadFilename(storyItem?.label ?? feedItem.label),
      },
    ]);
    setApprovedArtwork(feedDownload);
    setStep("approved");
  }

  function openMilestone(relativeDay: number) {
    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
    if (!feedItem) return;

    const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
    const storyAsset = storyItem ? resolveWorkflowAsset(storyItem, null, assets) : null;
    const feedApproved = isApprovedArtworkAsset(feedAsset);
    const storyApproved = storyItem ? isApprovedArtworkAsset(storyAsset) : true;

    if (feedApproved && storyApproved) {
      openMilestoneApproved(relativeDay);
      return;
    }

    if (feedApproved && storyItem) {
      openItem(storyItem);
      return;
    }

    openItem(feedItem);
  }

  async function startStoryGenerationFromFeed(relativeDay: number, storyItem: ArtworkPhaseWorkflowItem) {
    setSelectedItem(storyItem);
    setIsGeneratingStory(true);
    setGenerationWarning(null);
    setReviewError(null);
    setReviewVersions([]);

    const storyResult = await generateStoryFromFeedAction(eventId, relativeDay);
    router.refresh();
    setIsGeneratingStory(false);

    if (!storyResult.success) {
      setReviewError(storyResult.error ?? "Unable to generate the story version.");
      const defaults = buildCreatorDefaults(storyItem, phaseItems, assets, event, organizationName);
      setPrompt(defaults.prompt);
      revokeReferencePreviews(references);
      setReferences(defaults.references);
      setStep("create");
      return;
    }

    setReviewVersions(storyResult.versions ?? []);
    setHasGeneratedOnce(true);
    setGenerationWarning(
      storyResult.warning ??
        "Story version created from your feed design — pick the version you prefer.",
    );
    setStep("review");
  }

  function resetCreatorState() {
    revokeReferencePreviews(references);
    setPrompt("");
    setReferences([]);
    setApprovedArtwork(null);
    setMilestoneFormats(null);
    setGenerationError(null);
    setGenerationWarning(null);
    setReviewError(null);
    setHasGeneratedOnce(false);
    setIsGeneratingStory(false);
  }

  function handleBackToPicker() {
    resetCreatorState();
    setSelectedItem(null);
    setReviewVersions([]);
    setStep("pick");
  }

  function handleCreateNew() {
    if (!selectedItem) return;

    setApprovedArtwork(null);
    setReviewVersions([]);
    setHasGeneratedOnce(false);
    const defaults = buildCreatorDefaults(selectedItem, phaseItems, assets, event, organizationName);
    setPrompt(defaults.prompt);
    revokeReferencePreviews(references);
    setReferences(defaults.references);
    setStep("create");
  }

  function handleApproveInspiration(referenceId: string) {
    if (!selectedItem) return;

    const reference = references.find((entry) => entry.id === referenceId);
    if (!reference) return;

    setGenerationError(null);

    startReviewAction(async () => {
      const formData = new FormData();
      formData.set("workflowItemId", selectedItem.id);

      if (reference.source === "event_file" && reference.eventAssetId) {
        formData.append("inspirationEventAssetId", reference.eventAssetId);
      } else if (reference.source === "upload" && reference.file) {
        formData.append("inspirationFile", reference.file);
      } else {
        setGenerationError("Unable to use this reference as artwork.");
        return;
      }

      const result = await approveInspirationAsArtworkV2Action(eventId, formData);

      if (!result.success) {
        setGenerationError(result.error ?? "Unable to approve inspiration as artwork.");
        return;
      }

      router.refresh();

      if (isPhaseItem(selectedItem) && selectedItem.metaPlacement === "feed") {
        const storyItem = findMilestoneStoryItem(phaseItems, selectedItem.relativeDay);
        if (storyItem) {
          await startStoryGenerationFromFeed(selectedItem.relativeDay, storyItem);
          return;
        }
      }

      const imageUrl = result.approvedImageUrl ?? reference.previewUrl ?? null;
      if (imageUrl) {
        setApprovedArtwork({
          imageUrl,
          downloadFilename: buildArtworkDownloadFilename(selectedItem.label),
        });
      }

      if (isPhaseItem(selectedItem) && selectedItem.metaPlacement === "story") {
        openMilestoneApproved(selectedItem.relativeDay);
        return;
      }

      setStep("approved");
    });
  }

  function handleGenerate(mode: ArtworkGenerationMode) {
    if (!selectedItem || !prompt.trim()) return;

    setGenerationError(null);
    setGenerationWarning(null);
    setReviewError(null);
    setLastGenerationMode(mode);

    startGenerating(async () => {
      const formData = new FormData();
      formData.set("workflowItemId", selectedItem.id);
      formData.set("prompt", prompt);
      formData.set("generationMode", mode);
      appendReferencesToFormData(formData, references);

      const result = await generateArtworkV2Action(eventId, formData);

      if (!result.success) {
        setGenerationError(result.error ?? "Unable to generate artwork.");
        return;
      }

      setReviewVersions(result.versions ?? []);
      setHasGeneratedOnce(true);
      setGenerationWarning(result.warning ?? null);
      setStep("review");
    });
  }

  function handleRegenerate(mode: ArtworkGenerationMode) {
    if (!selectedItem || !prompt.trim()) {
      setStep("create");
      return;
    }

    handleGenerate(mode);
  }

  function handleDeny(versionId: string) {
    setReviewError(null);

    startReviewAction(async () => {
      const result = await denyArtworkV2Action(eventId, versionId);
      if (!result.success) {
        setReviewError(result.error ?? "Unable to remove artwork version.");
        return;
      }

      setReviewVersions((current) => current.filter((version) => version.id !== versionId));
    });
  }

  function handleApprove(versionId: string) {
    if (!selectedItem) return;

    setReviewError(null);

    startReviewAction(async () => {
      const approvedVersion = reviewVersions.find((version) => version.id === versionId);

      const result = await approveArtworkV2Action(eventId, versionId, selectedItem.id);
      if (!result.success) {
        setReviewError(result.error ?? "Unable to approve artwork.");
        return;
      }

      const imageUrl = result.approvedImageUrl ?? approvedVersion?.imageUrl ?? null;
      if (imageUrl) {
        setApprovedArtwork({
          imageUrl,
          downloadFilename: buildArtworkDownloadFilename(selectedItem.label),
        });
      } else {
        setApprovedArtwork(null);
      }

      setReviewVersions([]);
      router.refresh();

      if (isPhaseItem(selectedItem) && selectedItem.metaPlacement === "story") {
        openMilestoneApproved(selectedItem.relativeDay);
        return;
      }

      setStep("approved");
    });
  }

  function handleCreateStoryFromApproved() {
    if (!selectedItem || !isPhaseItem(selectedItem)) return;

    const storyItem = findMilestoneStoryItem(phaseItems, selectedItem.relativeDay);
    if (!storyItem) return;

    void startStoryGenerationFromFeed(selectedItem.relativeDay, storyItem);
  }

  function handleAdjust(versionId: string, adjustmentComments: string) {
    if (!selectedItem || !prompt.trim()) return;

    setReviewError(null);

    startReviewAction(async () => {
      const formData = new FormData();
      formData.set("workflowItemId", selectedItem.id);
      formData.set("originalPrompt", prompt);
      formData.set("adjustmentComments", adjustmentComments);
      formData.set("versionId", versionId);
      formData.set("generationMode", lastGenerationMode);
      appendReferencesToFormData(formData, references);

      const result = await adjustArtworkV2Action(eventId, formData);

      if (!result.success) {
        setReviewError(result.error ?? "Unable to generate updated versions.");
        return;
      }

      setReviewVersions((current) => [...current, ...(result.versions ?? [])]);
      setGenerationWarning(result.warning ?? null);
    });
  }

  function handleContinueNext() {
    if (!selectedItem) return;

    if (isPhaseItem(selectedItem)) {
      const nextFeed = nextMilestoneFeedItem(phaseItems, selectedItem.relativeDay);
      resetCreatorState();
      setReviewVersions([]);
      if (nextFeed) {
        openMilestone(nextFeed.relativeDay);
        return;
      }
      setSelectedItem(null);
      setStep("pick");
      return;
    }

    const next = nextWorkflowItem(selectedItem.id, workflowItems);
    resetCreatorState();
    setReviewVersions([]);
    if (next) {
      openItem(next);
      return;
    }
    setSelectedItem(null);
    setStep("pick");
  }

  function handleReturnToEvent() {
    window.location.hash = "plan";
    window.location.href = `/events/${eventId}#plan`;
  }

  const isPhaseWorkflow = phaseItems.length > 0;

  const hasNextMilestone =
    selectedItem && isPhaseItem(selectedItem)
      ? Boolean(nextMilestoneFeedItem(phaseItems, selectedItem.relativeDay))
      : Boolean(selectedItem && nextWorkflowItem(selectedItem.id, workflowItems));

  const pendingStoryItem =
    selectedItem &&
    isPhaseItem(selectedItem) &&
    selectedItem.metaPlacement === "feed"
      ? findMilestoneStoryItem(phaseItems, selectedItem.relativeDay)
      : null;

  const showCreateStoryAction = Boolean(
    pendingStoryItem &&
      step === "approved" &&
      !isApprovedArtworkAsset(
        resolveWorkflowAsset(pendingStoryItem, null, assets),
      ),
  );

  if (step === "pick") {
    return (
      <ArtworkV2PickerScreen
        items={pickerItems}
        isPhaseWorkflow={isPhaseWorkflow}
        onSelect={openItem}
        onSelectMilestone={isPhaseWorkflow ? openMilestone : undefined}
      />
    );
  }

  if (isGeneratingStory) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm font-medium text-cos-text">Creating story version…</p>
        <p className="mt-2 text-sm text-cos-muted">
          Adapting your feed design to a 9:16 story format.
        </p>
      </div>
    );
  }

  if (step === "create" && selectedItem) {
    return (
      <>
        <ArtworkV2CreatorScreen
          item={selectedItem}
          prompt={prompt}
          references={references}
          approvedArtworkAssets={approvedArtworkAssets}
          canvaUrl={canvaUrl}
          canImportFromCanva={canImportFromCanva}
          canvaIntegrationConfigured={canvaStatus.configured}
          canvaConnectHref={buildCanvaConnectHref()}
          isGenerating={isGenerating}
          isApprovingInspiration={isReviewBusy}
          error={generationError}
          onPromptChange={setPrompt}
          onReferencesChange={setReferences}
          onBack={handleBackToPicker}
          onGenerate={handleGenerate}
          onApproveInspiration={handleApproveInspiration}
          onOpenCanvaPicker={() => setCanvaPickerOpen(true)}
        />
        <CanvaDesignPicker
          open={canvaPickerOpen}
          onClose={() => setCanvaPickerOpen(false)}
          onSelect={(design) => handleImportCanvaDesign(design.id)}
          importingDesignId={importingCanvaDesignId}
          connectHref={buildCanvaConnectHref()}
        />
      </>
    );
  }

  if (step === "review" && selectedItem) {
    return (
      <>
        {generationWarning && (
          <p className="mb-3 text-sm text-amber-700" role="status">
            {generationWarning}
          </p>
        )}
        {reviewError && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {reviewError}
          </p>
        )}
        <ArtworkV2ReviewScreen
          item={selectedItem}
          versions={reviewVersions}
          isBusy={isReviewBusy || isGenerating}
          emptyVariant={hasGeneratedOnce ? "exhausted" : "initial"}
          lastGenerationMode={lastGenerationMode}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onAdjust={handleAdjust}
          onGenerate={() => setStep("create")}
          onRegenerate={handleRegenerate}
        />
      </>
    );
  }

  if (step === "approved" && selectedItem) {
    return (
      <ArtworkV2ApprovedScreen
        itemLabel={selectedItem.label}
        imageUrl={approvedArtwork?.imageUrl ?? null}
        downloadFilename={
          approvedArtwork?.downloadFilename ?? buildArtworkDownloadFilename(selectedItem.label)
        }
        milestoneFormats={milestoneFormats ?? undefined}
        hasNextItem={Boolean(hasNextMilestone)}
        onContinueNext={handleContinueNext}
        onReturnToEvent={handleReturnToEvent}
        onBackToArtworkList={handleBackToPicker}
        onCreateNew={handleCreateNew}
        showCreateStory={showCreateStoryAction}
        isCreatingStory={isGeneratingStory}
        onCreateStory={handleCreateStoryFromApproved}
      />
    );
  }

  return (
    <ArtworkV2PickerScreen
      items={pickerItems}
      isPhaseWorkflow={isPhaseWorkflow}
      onSelect={openItem}
      onSelectMilestone={isPhaseWorkflow ? openMilestone : undefined}
    />
  );
}
