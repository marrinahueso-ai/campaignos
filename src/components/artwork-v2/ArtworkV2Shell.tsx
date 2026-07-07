"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CanvaDesignPicker } from "@/components/canva/CanvaDesignPicker";
import {
  ArtworkCampaignWorkspace,
} from "@/components/event-workspace/artwork/ArtworkCampaignWorkspace";
import type { ArtworkCustomizeAction } from "@/components/event-workspace/artwork/ArtworkCustomizeToolbar";
import { ArtworkV2ApprovedScreen } from "@/components/artwork-v2/ArtworkV2ApprovedScreen";
import {
  ArtworkV2BatchGenerateScreen,
  type ArtworkV2BatchMilestoneProgress,
} from "@/components/artwork-v2/ArtworkV2BatchGenerateScreen";
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
  generateRemainingArtworkV2Action,
  generateStoryFromFeedAction,
  getArtworkV2ReviewVersionsAction,
  importCanvaDesignAsInspirationV2Action,
  prepareArtworkV2RegenerationAction,
  resetArtworkV2SlotAction,
} from "@/lib/artwork-v2/actions";
import { getCanvaConnectionStatusAction } from "@/lib/canva/actions";
import {
  getApprovedArtworkAssets,
  isApprovedArtworkAsset,
  pickDefaultInspirationAsset,
  type ArtworkPhaseWorkflowItem,
  type MetaArtworkPlacement,
} from "@/lib/artwork-v2/campaign-phases";
import { buildDefaultArtworkPrompt } from "@/lib/artwork-v2/event-prompt";
import {
  formatLabelToMetaPlacement,
  metaPlacementToDefaultFormatLabel,
} from "@/lib/artwork-v2/format-selection";
import {
  getRemainingArtworkMilestones,
  resolveMilestoneArtworkStatus,
} from "@/lib/artwork-v2/batch-generate";
import { resolveCanvaUrl } from "@/lib/artwork-v2/canva-link";
import {
  findMilestoneFeedItem,
  findMilestoneStoryItem,
} from "@/lib/artwork-v2/milestone-workflow";
import { isStoryMilestoneDistinctlyApproved } from "@/lib/artwork-v2/milestone-assets";
import { getArtworkWorkflowItems } from "@/lib/creative-studio/artwork-defaults";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import type { ArtworkV2Reference, ArtworkV2ReviewVersion, ArtworkV2Step } from "@/lib/artwork-v2/types";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import { buildArtworkDownloadFilename } from "@/lib/artwork-v2/download";
import { normalizeReviewVersionIndices, ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import type { ArtworkV2ApprovedFormat } from "@/components/artwork-v2/ArtworkV2ApprovedScreen";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import {
  findMetaPublishBundleForDay,
  resolveMilestoneWorkflowBadgeStatus,
} from "@/lib/meta-publishing/milestone-workflow-badge";
import { resolveMetaPublishBundleScheduledFor } from "@/lib/meta-publishing/resolve-bundle-scheduled-for";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
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
  metaPublishBundles?: MetaPublishBundle[];
  onNavigateToCaptions?: (relativeDay: number) => void;
  initialRelativeDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  /** Campaign workflow layout matching captions / review-publish redesign. */
  variant?: "legacy" | "campaign";
}

function resolveArtworkRelativeDay(
  milestones: { relativeDay: number }[],
  preferredDay: number | null | undefined,
): number | null {
  if (milestones.length === 0) {
    return null;
  }

  if (
    preferredDay != null &&
    milestones.some((milestone) => milestone.relativeDay === preferredDay)
  ) {
    return preferredDay;
  }

  return milestones[0]?.relativeDay ?? null;
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

    if (reference.source === "stored" && reference.inspirationStoragePath) {
      formData.append("inspirationStoragePath", reference.inspirationStoragePath);
    }
  }
}

function isPhaseItem(item: ArtworkWorkflowItem): item is ArtworkPhaseWorkflowItem {
  return typeof item.relativeDay === "number";
}

function syncCampaignFormatFromItem(
  item: ArtworkWorkflowItem,
  setFormat: (format: string) => void,
) {
  if (!isPhaseItem(item)) {
    return;
  }

  setFormat(metaPlacementToDefaultFormatLabel(item.metaPlacement));
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

type MilestoneFormatOverrides = Partial<
  Record<MetaArtworkPlacement, { imageUrl: string; downloadFilename: string }>
>;

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
  metaPublishBundles = [],
  onNavigateToCaptions,
  initialRelativeDay = null,
  onFocusedMilestoneChange,
  variant = "legacy",
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

  const milestoneOptions = useMemo(
    () =>
      phaseItems
        .filter((item) => item.metaPlacement === "feed")
        .map((item) => ({
          relativeDay: item.relativeDay,
          title: item.label,
        })),
    [phaseItems],
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

  const selectedRelativeDay = useMemo(() => {
    if (selectedItem && isPhaseItem(selectedItem)) {
      return selectedItem.relativeDay;
    }

    return resolveArtworkRelativeDay(milestoneOptions, initialRelativeDay);
  }, [selectedItem, milestoneOptions, initialRelativeDay]);

  const selectedScheduledFor = useMemo(() => {
    if (selectedRelativeDay == null) {
      return null;
    }

    const bundle = findMetaPublishBundleForDay(metaPublishBundles, selectedRelativeDay);
    return resolveMetaPublishBundleScheduledFor(bundle);
  }, [metaPublishBundles, selectedRelativeDay]);

  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ArtworkV2Reference[]>([]);
  const [approvedArtwork, setApprovedArtwork] = useState<{
    imageUrl: string;
    downloadFilename: string;
  } | null>(null);
  const [reviewVersions, setReviewVersions] = useState<ArtworkV2ReviewVersion[]>([]);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [milestoneFormats, setMilestoneFormats] = useState<ArtworkV2ApprovedFormat[] | null>(null);
  const [approvedMilestoneDay, setApprovedMilestoneDay] = useState<number | null>(null);
  const [milestoneFormatOverrides, setMilestoneFormatOverrides] =
    useState<MilestoneFormatOverrides | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [canvaPickerOpen, setCanvaPickerOpen] = useState(false);
  const [importingCanvaDesignId, setImportingCanvaDesignId] = useState<string | null>(null);
  const [canvaStatus, setCanvaStatus] = useState({ configured: false, connected: false });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const [lastGenerationMode, setLastGenerationMode] = useState<ArtworkGenerationMode>("quick");
  const [generationMode, setGenerationMode] = useState<ArtworkGenerationMode>("quick");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [campaignFormat, setCampaignFormat] = useState<string>("Instagram Post (1:1)");
  const generationBasePromptRef = useRef("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isReviewBusy, startReviewAction] = useTransition();
  const [batchMilestones, setBatchMilestones] = useState<ArtworkV2BatchMilestoneProgress[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const batchCancelRef = useRef(false);
  const selectedItemRef = useRef<ArtworkWorkflowItem | null>(null);

  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  useEffect(() => {
    if (selectedVersionId && !reviewVersions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(null);
    }
  }, [selectedVersionId, reviewVersions]);

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

  const buildMilestoneFormats = useCallback(
    (
      relativeDay: number,
      overrides?: MilestoneFormatOverrides | null,
    ): ArtworkV2ApprovedFormat[] | null => {
      const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
      const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
      if (!feedItem) {
        return null;
      }

      const feedDownload = resolveApprovedDownload(feedItem, assets);
      const storyDownload = storyItem ? resolveApprovedDownload(storyItem, assets) : null;
      const feedOverride = overrides?.feed;
      const storyOverride = overrides?.story;

      return [
        {
          label: "Feed 1:1",
          imageUrl: feedOverride?.imageUrl ?? feedDownload?.imageUrl ?? null,
          downloadFilename:
            feedOverride?.downloadFilename ??
            feedDownload?.downloadFilename ??
            buildArtworkDownloadFilename(feedItem.label),
        },
        {
          label: "Story 9:16",
          imageUrl: storyOverride?.imageUrl ?? storyDownload?.imageUrl ?? null,
          downloadFilename:
            storyOverride?.downloadFilename ??
            storyDownload?.downloadFilename ??
            buildArtworkDownloadFilename(storyItem?.label ?? feedItem.label),
        },
      ];
    },
    [assets, phaseItems],
  );

  function openItem(item: ArtworkWorkflowItem) {
    setSelectedItem(item);
    syncCampaignFormatFromItem(item, setCampaignFormat);
    setMilestoneFormats(null);
    setApprovedMilestoneDay(null);
    setMilestoneFormatOverrides(null);
    setGenerationError(null);
    setGenerationWarning(null);
    setReviewError(null);
    setIsGeneratingStory(false);

    if (isPhaseItem(item)) {
      const feedItem = findMilestoneFeedItem(phaseItems, item.relativeDay);
      const storyItem = findMilestoneStoryItem(phaseItems, item.relativeDay);
      if (feedItem && storyItem) {
        const feedApproved = isApprovedArtworkAsset(
          resolveWorkflowAsset(feedItem, null, assets),
        );
        const storyApproved = isStoryMilestoneDistinctlyApproved(
          feedItem,
          storyItem,
          assets,
        );
        if (feedApproved && storyApproved) {
          openMilestoneApproved(item.relativeDay);
          return;
        }
      }
    }

    const approvedDownload = resolveApprovedDownload(item, assets);
    if (approvedDownload) {
      setApprovedArtwork(approvedDownload);
      setStep("approved");
      return;
    }

    const asset = resolveWorkflowAsset(item, null, assets);
    const readyForReview =
      asset?.planStatus === "generated" || asset?.planStatus === "in_progress";

    if (readyForReview) {
      void openReviewForItem(item);
      return;
    }

    setApprovedArtwork(null);
    const defaults = buildCreatorDefaults(item, phaseItems, assets, event, organizationName);
    setPrompt(defaults.prompt);
    generationBasePromptRef.current = defaults.prompt;
    setReferences(defaults.references);
    setStep("create");
  }

  async function openReviewForItem(item: ArtworkWorkflowItem) {
    setSelectedItem(item);
    syncCampaignFormatFromItem(item, setCampaignFormat);
    setReviewError(null);
    setGenerationWarning(null);
    setHasGeneratedOnce(true);

    const result = await getArtworkV2ReviewVersionsAction(eventId, item.id);
    if (!result.success || result.versions.length === 0) {
      const defaults = buildCreatorDefaults(item, phaseItems, assets, event, organizationName);
      setPrompt(defaults.prompt);
      generationBasePromptRef.current = defaults.prompt;
      setReferences(defaults.references);
      setStep("create");
      return;
    }

    const defaults = buildCreatorDefaults(item, phaseItems, assets, event, organizationName);
    setPrompt(defaults.prompt);
    generationBasePromptRef.current = defaults.prompt;
    revokeReferencePreviews(references);
    setReferences(defaults.references);
    setReviewVersions(result.versions);
    setStep("review");
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
      openMilestoneApproved(
        selectedItem.relativeDay,
        imageUrl
          ? {
              story: {
                imageUrl,
                downloadFilename: buildArtworkDownloadFilename(selectedItem.label),
              },
            }
          : undefined,
      );
      return;
    }

    if (isPhaseItem(selectedItem) && selectedItem.metaPlacement === "feed") {
      const storyItem = findMilestoneStoryItem(phaseItems, selectedItem.relativeDay);
      if (storyItem) {
        await continueStoryWorkflowAfterFeedApproval(selectedItem.relativeDay);
        return;
      }
    }

    setStep("approved");
  }

  function handleImportCanvaDesign(designId: string, designTitle?: string) {
    if (!selectedItem) return;

    if (references.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
      setGenerationError(
        `You can attach up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images.`,
      );
      return;
    }

    setGenerationError(null);
    setImportingCanvaDesignId(designId);

    startReviewAction(async () => {
      const result = await importCanvaDesignAsInspirationV2Action(
        eventId,
        selectedItem.id,
        designId,
        designTitle,
      );

      setImportingCanvaDesignId(null);

      if (!result.success || !result.reference) {
        setGenerationError(result.error ?? "Unable to import from Canva.");
        return;
      }

      const hadInspiration = references.length > 0;
      const nextReferences: ArtworkV2Reference[] = [
        ...references,
        {
          id: crypto.randomUUID(),
          source: "stored",
          label: result.reference.label,
          previewUrl: result.reference.previewUrl,
          inspirationStoragePath: result.reference.inspirationStoragePath,
        },
      ];

      setReferences(nextReferences);

      if (!hadInspiration) {
        setPrompt(
          buildDefaultArtworkPrompt({
            event,
            organizationName,
            item: selectedItem,
            hasInspiration: true,
          }),
        );
      }

      setCanvaPickerOpen(false);
    });
  }

  function openMilestoneApproved(
    relativeDay: number,
    overrides?: MilestoneFormatOverrides,
  ) {
    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    if (!feedItem) return;

    const formats = buildMilestoneFormats(relativeDay, overrides);
    if (!formats) return;

    const feedDownload = resolveApprovedDownload(feedItem, assets);

    setSelectedItem(feedItem);
    setApprovedMilestoneDay(relativeDay);
    setMilestoneFormatOverrides(overrides ?? null);
    setMilestoneFormats(formats);
    setApprovedArtwork(
      feedDownload ??
        (overrides?.feed
          ? {
              imageUrl: overrides.feed.imageUrl,
              downloadFilename: overrides.feed.downloadFilename,
            }
          : null),
    );
    setStep("approved");
  }

  useEffect(() => {
    if (step !== "approved" || approvedMilestoneDay == null) {
      return;
    }

    const formats = buildMilestoneFormats(approvedMilestoneDay, milestoneFormatOverrides);
    if (!formats) {
      return;
    }

    setMilestoneFormats(formats);

    const feedItem = findMilestoneFeedItem(phaseItems, approvedMilestoneDay);
    if (feedItem) {
      const feedDownload = resolveApprovedDownload(feedItem, assets);
      if (feedDownload) {
        setApprovedArtwork(feedDownload);
      }
    }
  }, [assets, step, approvedMilestoneDay, milestoneFormatOverrides, phaseItems, buildMilestoneFormats]);

  function openMilestone(relativeDay: number) {
    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
    if (!feedItem) return;

    const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
    const storyAsset = storyItem ? resolveWorkflowAsset(storyItem, null, assets) : null;
    const feedApproved = isApprovedArtworkAsset(feedAsset);
    const storyApproved = storyItem
      ? isStoryMilestoneDistinctlyApproved(feedItem, storyItem, assets)
      : true;
    const milestoneStatus = resolveMilestoneArtworkStatus(relativeDay, phaseItems, assets);

    if (feedApproved && storyApproved) {
      openMilestoneApproved(relativeDay);
      return;
    }

    if (milestoneStatus === "ready_for_review") {
      const feedReady =
        feedAsset?.planStatus === "generated" || feedAsset?.planStatus === "in_progress";
      const storyReady =
        storyAsset?.planStatus === "generated" || storyAsset?.planStatus === "in_progress";

      if (!feedApproved && feedReady) {
        void openReviewForItem(feedItem);
        return;
      }

      if (feedApproved && storyItem && storyReady) {
        void openReviewForItem(storyItem);
        return;
      }
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

  async function continueStoryWorkflowAfterFeedApproval(relativeDay: number) {
    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);
    if (!storyItem || !feedItem) {
      setStep("approved");
      return;
    }

    if (isStoryMilestoneDistinctlyApproved(feedItem, storyItem, assets)) {
      openMilestoneApproved(relativeDay);
      return;
    }

    const reviewResult = await getArtworkV2ReviewVersionsAction(eventId, storyItem.id);
    if (reviewResult.success && reviewResult.versions.length > 0) {
      await openReviewForItem(storyItem);
      return;
    }

    await startStoryGenerationFromFeed(relativeDay, storyItem);
  }

  function resetCreatorState() {
    revokeReferencePreviews(references);
    setPrompt("");
    setReferences([]);
    setApprovedArtwork(null);
    setMilestoneFormats(null);
    setApprovedMilestoneDay(null);
    setMilestoneFormatOverrides(null);
    setGenerationError(null);
    setGenerationWarning(null);
    setReviewError(null);
    setResetError(null);
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
    void beginRegeneration(selectedItem);
  }

  function handleCreateNewFeed() {
    const relativeDay =
      approvedMilestoneDay ??
      (selectedItem && isPhaseItem(selectedItem) ? selectedItem.relativeDay : null);
    if (relativeDay == null) return;

    const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
    if (!feedItem) return;

    void beginRegeneration(feedItem);
  }

  function handleDeleteArtwork() {
    if (!selectedItem) return;

    const deleteTarget =
      milestoneFormats && approvedMilestoneDay != null
        ? findMilestoneFeedItem(phaseItems, approvedMilestoneDay)
        : selectedItem;

    if (!deleteTarget) return;

    setResetError(null);

    startReviewAction(async () => {
      const result = await resetArtworkV2SlotAction(eventId, deleteTarget.id);
      if (!result.success) {
        setResetError(result.error ?? "Unable to delete artwork.");
        return;
      }

      router.refresh();
      resetCreatorState();
      setReviewVersions([]);
      setSelectedItem(deleteTarget);
      const defaults = buildCreatorDefaults(
        deleteTarget,
        phaseItems,
        assets,
        event,
        organizationName,
      );
      setPrompt(defaults.prompt);
      revokeReferencePreviews(references);
      setReferences(defaults.references);
      setStep("create");
    });
  }

  function beginRegeneration(workflowItem: ArtworkWorkflowItem) {
    setResetError(null);

    startReviewAction(async () => {
      const result = await prepareArtworkV2RegenerationAction(eventId, workflowItem.id);
      if (!result.success) {
        setResetError(result.error ?? "Unable to prepare a new version.");
        return;
      }

      router.refresh();
      setApprovedArtwork(null);
      setMilestoneFormats(null);
      setApprovedMilestoneDay(null);
      setMilestoneFormatOverrides(null);
      setReviewVersions([]);
      setHasGeneratedOnce(false);
      setSelectedItem(workflowItem);
      const defaults = buildCreatorDefaults(
        workflowItem,
        phaseItems,
        assets,
        event,
        organizationName,
      );
      setPrompt(defaults.prompt);
      revokeReferencePreviews(references);
      setReferences(defaults.references);
      setStep("create");
    });
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
      } else if (reference.source === "stored" && reference.inspirationStoragePath) {
        formData.append("inspirationStoragePath", reference.inspirationStoragePath);
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
          await continueStoryWorkflowAfterFeedApproval(selectedItem.relativeDay);
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
        openMilestoneApproved(
          selectedItem.relativeDay,
          imageUrl
            ? {
                story: {
                  imageUrl,
                  downloadFilename: buildArtworkDownloadFilename(selectedItem.label),
                },
              }
            : undefined,
        );
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
    generationBasePromptRef.current = prompt.trim();

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

  function handleCampaignGenerate(mode: ArtworkGenerationMode) {
    if (!selectedItem || !prompt.trim()) return;

    if (selectedVersionId && reviewVersions.length > 0) {
      handleAdjust(selectedVersionId, prompt.trim(), generationBasePromptRef.current || prompt.trim());
      return;
    }

    handleGenerate(mode);
  }

  async function handleCampaignFormatChange(format: string) {
    setCampaignFormat(format);

    if (!selectedItem || !isPhaseItem(selectedItem)) {
      return;
    }

    const placement = formatLabelToMetaPlacement(format);
    const targetItem =
      placement === "story"
        ? findMilestoneStoryItem(phaseItems, selectedItem.relativeDay)
        : findMilestoneFeedItem(phaseItems, selectedItem.relativeDay);

    if (!targetItem || targetItem.id === selectedItem.id) {
      return;
    }

    setSelectedItem(targetItem);
    setGenerationError(null);
    setReviewError(null);
    setSelectedVersionId(null);

    const defaults = buildCreatorDefaults(targetItem, phaseItems, assets, event, organizationName);
    setPrompt(defaults.prompt);
    generationBasePromptRef.current = defaults.prompt;
    revokeReferencePreviews(references);
    setReferences(defaults.references);

    const reviewResult = await getArtworkV2ReviewVersionsAction(eventId, targetItem.id);
    if (reviewResult.success && reviewResult.versions.length > 0) {
      setReviewVersions(reviewResult.versions);
      setHasGeneratedOnce(true);
      setStep("review");
      return;
    }

    setReviewVersions([]);
    setHasGeneratedOnce(false);
    setStep("create");
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
    const approvingItem = selectedItemRef.current;
    if (!approvingItem) return;

    setReviewError(null);

    startReviewAction(async () => {
      const approvedVersion = reviewVersions.find((version) => version.id === versionId);

      const result = await approveArtworkV2Action(eventId, versionId, approvingItem.id);
      if (!result.success) {
        setReviewError(result.error ?? "Unable to approve artwork.");
        return;
      }

      const imageUrl = result.approvedImageUrl ?? approvedVersion?.imageUrl ?? null;
      if (imageUrl) {
        setApprovedArtwork({
          imageUrl,
          downloadFilename: buildArtworkDownloadFilename(approvingItem.label),
        });
      } else {
        setApprovedArtwork(null);
      }

      setReviewVersions([]);
      router.refresh();

      if (isPhaseItem(approvingItem) && approvingItem.metaPlacement === "feed") {
        const storyItem = findMilestoneStoryItem(phaseItems, approvingItem.relativeDay);
        if (storyItem) {
          await continueStoryWorkflowAfterFeedApproval(approvingItem.relativeDay);
          return;
        }
      }

      if (isPhaseItem(approvingItem) && approvingItem.metaPlacement === "story") {
        openMilestoneApproved(
          approvingItem.relativeDay,
          imageUrl
            ? {
                story: {
                  imageUrl,
                  downloadFilename: buildArtworkDownloadFilename(approvingItem.label),
                },
              }
            : undefined,
        );
        return;
      }

      setStep("approved");
    });
  }

  function handleAdjust(
    versionId: string,
    adjustmentComments: string,
    originalPrompt: string = generationBasePromptRef.current,
  ) {
    if (!selectedItem || !adjustmentComments.trim()) return;

    setReviewError(null);

    startReviewAction(async () => {
      const formData = new FormData();
      formData.set("workflowItemId", selectedItem.id);
      formData.set("originalPrompt", originalPrompt || adjustmentComments);
      formData.set("adjustmentComments", adjustmentComments);
      formData.set("versionId", versionId);
      formData.set("generationMode", lastGenerationMode);
      appendReferencesToFormData(formData, references);

      const result = await adjustArtworkV2Action(eventId, formData);

      if (!result.success) {
        setReviewError(result.error ?? "Unable to generate updated versions.");
        return;
      }

      setReviewVersions((current) =>
        normalizeReviewVersionIndices([...current, ...(result.versions ?? [])]),
      );
      setGenerationWarning(result.warning ?? null);
    });
  }

  function handleContinueToCaptions() {
    if (!selectedItem || !isPhaseItem(selectedItem) || !milestoneFormats) return;
    onNavigateToCaptions?.(approvedMilestoneDay ?? selectedItem.relativeDay);
  }

  const isPhaseWorkflow = phaseItems.length > 0;

  const getMilestoneStatus = useCallback(
    (relativeDay: number) => {
      const baseStatus = resolveMilestoneArtworkStatus(relativeDay, phaseItems, assets);
      const bundle = findMetaPublishBundleForDay(metaPublishBundles, relativeDay);
      return resolveMilestoneWorkflowBadgeStatus(baseStatus, bundle);
    },
    [phaseItems, assets, metaPublishBundles],
  );

  function updateBatchMilestone(
    index: number,
    update: Partial<ArtworkV2BatchMilestoneProgress>,
  ) {
    setBatchMilestones((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...update } : entry,
      ),
    );
  }

  async function runBatchGeneration(anchorRelativeDay?: number) {
    const remaining = getRemainingArtworkMilestones(phaseItems, assets);

    for (let index = 0; index < remaining.length; index += 1) {
      if (batchCancelRef.current) {
        setBatchMilestones((current) =>
          current.map((entry, entryIndex) =>
            entryIndex >= index && entry.status === "pending"
              ? { ...entry, status: "cancelled" }
              : entry,
          ),
        );
        break;
      }

      const milestone = remaining[index]!;
      setBatchCurrentIndex(index);
      updateBatchMilestone(index, { status: "generating_feed" });

      const feedResult = await generateRemainingArtworkV2Action(eventId, {
        anchorRelativeDay,
        relativeDay: milestone.relativeDay,
        phase: "feed",
      });

      if (batchCancelRef.current) {
        break;
      }

      const feedMilestoneResult = feedResult.milestones[0];
      if (!feedResult.success || feedMilestoneResult?.error) {
        updateBatchMilestone(index, {
          status: "failed",
          error: feedMilestoneResult?.error ?? feedResult.error ?? "Unable to generate feed artwork.",
        });
        continue;
      }

      updateBatchMilestone(index, { status: "generating_story" });

      const storyResult = await generateRemainingArtworkV2Action(eventId, {
        anchorRelativeDay,
        relativeDay: milestone.relativeDay,
        phase: "story",
      });

      if (batchCancelRef.current) {
        break;
      }

      const storyMilestoneResult = storyResult.milestones[0];
      if (!storyResult.success || storyMilestoneResult?.error) {
        updateBatchMilestone(index, {
          status: "failed",
          error:
            storyMilestoneResult?.error ??
            storyResult.error ??
            "Feed created, but story generation failed.",
        });
        continue;
      }

      updateBatchMilestone(index, { status: "ready" });
    }

    router.refresh();
    setBatchRunning(false);
    setBatchComplete(true);
  }

  function handleStartBatchGenerate(anchorRelativeDay?: number) {
    const remaining = getRemainingArtworkMilestones(phaseItems, assets);
    if (remaining.length === 0) {
      return;
    }

    batchCancelRef.current = false;
    setBatchMilestones(
      remaining.map((milestone) => ({
        relativeDay: milestone.relativeDay,
        title: milestone.title,
        status: "pending",
      })),
    );
    setBatchCurrentIndex(0);
    setBatchRunning(true);
    setBatchComplete(false);
    setStep("batch-generate");
    void runBatchGeneration(anchorRelativeDay);
  }

  function handleCancelBatchGenerate() {
    batchCancelRef.current = true;
    setBatchRunning(false);
    setBatchComplete(true);
  }

  function handleBatchReviewMilestones() {
    const firstReady = batchMilestones.find((entry) => entry.status === "ready");
    resetCreatorState();
    setReviewVersions([]);
    setStep("pick");
    if (firstReady) {
      openMilestone(firstReady.relativeDay);
    }
  }

  function handleSelectMilestone(relativeDay: number) {
    if (relativeDay === selectedRelativeDay) {
      onFocusedMilestoneChange?.(relativeDay);
      return;
    }

    onFocusedMilestoneChange?.(relativeDay);
    openMilestone(relativeDay);
  }

  const autoOpenAttemptedRef = useRef(false);
  const [campaignInitializing, setCampaignInitializing] = useState(variant === "campaign");

  useEffect(() => {
    if (variant !== "campaign" || !isPhaseWorkflow || initialRelativeDay == null) {
      return;
    }

    if (!milestoneOptions.some((milestone) => milestone.relativeDay === initialRelativeDay)) {
      return;
    }

    if (selectedRelativeDay === initialRelativeDay) {
      return;
    }

    openMilestone(initialRelativeDay);
  }, [
    variant,
    isPhaseWorkflow,
    initialRelativeDay,
    milestoneOptions,
    selectedRelativeDay,
  ]);

  useEffect(() => {
    if (variant !== "campaign") {
      setCampaignInitializing(false);
      return;
    }

    if (step !== "pick" || autoOpenAttemptedRef.current) {
      setCampaignInitializing(false);
      return;
    }

    autoOpenAttemptedRef.current = true;

    if (isPhaseWorkflow) {
      const preferredDay = resolveArtworkRelativeDay(milestoneOptions, initialRelativeDay);
      if (preferredDay != null) {
        openMilestone(preferredDay);
        setCampaignInitializing(false);
        return;
      }

      const firstPending = phaseItems.find((item) => {
        if (item.metaPlacement !== "feed") {
          return false;
        }
        const asset = resolveWorkflowAsset(item, null, assets);
        return !isApprovedArtworkAsset(asset);
      });

      if (firstPending) {
        openMilestone(firstPending.relativeDay);
        setCampaignInitializing(false);
        return;
      }

      const firstFeed = phaseItems.find((item) => item.metaPlacement === "feed");
      if (firstFeed) {
        openMilestone(firstFeed.relativeDay);
      }

      setCampaignInitializing(false);
      return;
    }

    const firstPending = workflowItems.find((item) => !resolveApprovedDownload(item, assets));
    if (firstPending) {
      openItem(firstPending);
    }

    setCampaignInitializing(false);
  }, [variant, step, isPhaseWorkflow, phaseItems, assets, workflowItems]);

  function handleCampaignApproveSelected() {
    if (!selectedVersionId) {
      return;
    }

    handleApprove(selectedVersionId);
  }

  function handleCampaignGenerateMore() {
    handleRegenerate(lastGenerationMode);
  }

  function handleCampaignCustomizeAction(_action: ArtworkCustomizeAction) {
    // Prompt prefill is handled in ArtworkCampaignWorkspace.
  }

  if (variant === "campaign" && step === "pick" && campaignInitializing) {
    return (
      <div className="min-h-[20rem] animate-pulse rounded-sm bg-cos-bg/40" aria-hidden />
    );
  }

  if (variant === "campaign" && (step === "create" || step === "review") && selectedItem) {
    return (
      <ArtworkCampaignWorkspace
        item={selectedItem}
        milestones={milestoneOptions}
        selectedRelativeDay={selectedRelativeDay}
        scheduledFor={selectedScheduledFor}
        onSelectMilestone={isPhaseWorkflow ? handleSelectMilestone : undefined}
        prompt={prompt}
        format={
          campaignFormat ||
          metaPlacementToDefaultFormatLabel(
            isPhaseItem(selectedItem) && selectedItem.metaPlacement === "story"
              ? "story"
              : "feed",
          )
        }
        references={references}
        versions={reviewVersions}
        generationMode={generationMode}
        selectedVersionId={selectedVersionId}
        isGenerating={isGenerating}
        isReviewBusy={isReviewBusy}
        isApprovingInspiration={isReviewBusy}
        error={generationError}
        reviewError={reviewError}
        generationWarning={generationWarning}
        onPromptChange={setPrompt}
        onFormatChange={handleCampaignFormatChange}
        onReferencesChange={setReferences}
        onGenerationModeChange={setGenerationMode}
        onGenerate={handleCampaignGenerate}
        onApproveInspiration={handleApproveInspiration}
        onSelectVersion={setSelectedVersionId}
        onApproveSelected={handleCampaignApproveSelected}
        onGenerateMore={handleCampaignGenerateMore}
        onCustomizeAction={handleCampaignCustomizeAction}
      />
    );
  }

  if (step === "pick") {
    return (
      <ArtworkV2PickerScreen
        items={pickerItems}
        isPhaseWorkflow={isPhaseWorkflow}
        onSelect={openItem}
        onSelectMilestone={isPhaseWorkflow ? openMilestone : undefined}
        getMilestoneStatus={isPhaseWorkflow ? getMilestoneStatus : undefined}
      />
    );
  }

  if (step === "batch-generate") {
    return (
      <ArtworkV2BatchGenerateScreen
        milestones={batchMilestones}
        currentIndex={batchCurrentIndex}
        isRunning={batchRunning}
        isComplete={batchComplete}
        onCancel={handleCancelBatchGenerate}
        onBackToArtworkList={handleBackToPicker}
        onReviewMilestones={handleBatchReviewMilestones}
      />
    );
  }

  if (isGeneratingStory) {
    return (
      <div className="space-y-6">
        <header>
          <p className="studio-eyebrow">Create</p>
          <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Story version</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Adapting your feed design to a 9:16 story format.
          </p>
        </header>
        <div className="border border-cos-border bg-cos-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-cos-text">Creating story version…</p>
        </div>
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
          onSelect={(design) => handleImportCanvaDesign(design.id, design.title)}
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
          onBack={handleBackToPicker}
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
        milestoneFormats={milestoneFormats ?? undefined}
        onContinueToCaptions={milestoneFormats ? handleContinueToCaptions : undefined}
        onModifyArtwork={milestoneFormats ? handleCreateNewFeed : handleCreateNew}
        onDelete={handleDeleteArtwork}
        onBackToArtworkList={handleBackToPicker}
        isResetting={isReviewBusy}
        resetError={resetError}
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
