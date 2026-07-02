"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_GENERATION_SETTINGS } from "@/lib/ai-artwork/constants";
import {
  MANUAL_PROMPT_REQUIRED_MESSAGE,
  resolveFinalArtworkImagePrompt,
} from "@/lib/ai-artwork/generation-mode";
import {
  createConceptBatchId,
  deleteConceptRow,
  discardConcept,
  saveGenerationSettings,
  setAssetPlanStatusInProgress,
} from "@/lib/ai-artwork/mutations";
import { getConceptById } from "@/lib/ai-artwork/queries";
import { isArtworkGenerationConfigured } from "@/lib/ai-artwork/provider";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { activateConceptAsAsset } from "@/lib/ai-artwork/versions";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getArtworkWorkflowItems } from "@/lib/creative-studio/artwork-defaults";
import {
  resolveWorkflowAsset,
  type ArtworkWorkflowItem,
} from "@/lib/creative-studio/artwork-workflow";
import { ensurePlanAssetRow } from "@/lib/creative-director/mutations";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import {
  resolveAssetImageUrl,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import { syncMetaPublicationSlots } from "@/lib/meta-publishing/sync-slots";
import {
  getArtworkPhaseItems,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { buildDefaultArtworkPrompt } from "@/lib/artwork-v2/event-prompt";
import {
  findMilestoneFeedItem,
  findMilestoneStoryItem,
} from "@/lib/artwork-v2/milestone-workflow";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import {
  parseArtworkGenerationModeFromForm,
  resolveArtworkGenerationProfile,
} from "@/lib/artwork-v2/generation-mode";
import { runArtworkV2Generation } from "@/lib/artwork-v2/generation";
import { activateExternalArtworkOnAsset } from "@/lib/artwork-v2/activation";
import { maybePromoteApprovedArtworkToHero } from "@/lib/artwork-v2/hero";
import { resolveArtworkV2ImageSizePreset } from "@/lib/artwork-v2/image-size";
import type { ArtworkV2GenerationResult } from "@/lib/artwork-v2/types";
import {
  getCanvaConnectionForCurrentOrg,
  getValidCanvaAccessToken,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { exportCanvaDesignAsPng } from "@/lib/canva/import-design";

function revalidateArtworkV2Paths(eventId: string): void {
  revalidatePath("/creative-studio");
  revalidateEventPaths(eventId);
}

function buildReferenceStoragePath(
  eventId: string,
  batchId: string,
  filename: string,
  index: number,
): string {
  const safeName = sanitizeEventAssetFilename(filename);
  return `${eventId}/artwork-v2/references/${batchId}/${index}-${safeName}`;
}

async function uploadedByLabel(): Promise<string> {
  const role = await getCurrentCampaignRole();
  return campaignRoleLabel(role);
}

async function resolveWorkflowItem(
  eventId: string,
  workflowItemId: string,
): Promise<{ item: ArtworkWorkflowItem; assetId: string } | { error: string }> {
  const event = await getEventById(eventId);
  if (!event) {
    return { error: "Event not found." };
  }

  const assets = await getCampaignAssetsForEvent(eventId);
  const communicationSteps = await getEventCommunicationSteps(eventId);
  const workflowItems = getArtworkWorkflowItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
    communicationSteps,
    assets,
  });

  const item = workflowItems.find((entry) => entry.id === workflowItemId);
  if (!item) {
    return { error: "Artwork type not found for this campaign." };
  }

  const asset = resolveWorkflowAsset(item, null, assets);
  let assetId = asset?.id ?? null;
  if (!assetId) {
    assetId = await ensurePlanAssetRow(eventId, item.assetType, item.planLabel);
  }

  if (!assetId) {
    return { error: "Unable to prepare artwork slot." };
  }

  return { item, assetId };
}

async function resolveReferenceImageUrls(input: {
  eventId: string;
  batchId: string;
  inspirationEventAssetIds: string[];
  inspirationFiles: File[];
}): Promise<{ urls: string[]; inspirationAssetIds: string[]; error?: string }> {
  const totalRequested =
    input.inspirationEventAssetIds.length + input.inspirationFiles.length;

  if (totalRequested > ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
    return {
      urls: [],
      inspirationAssetIds: [],
      error: `You can attach up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images.`,
    };
  }

  const urls: string[] = [];
  const inspirationAssetIds: string[] = [];
  const seenAssetIds = new Set<string>();
  const campaignAssets = await getCampaignAssetsForEvent(input.eventId);

  for (const assetId of input.inspirationEventAssetIds) {
    if (seenAssetIds.has(assetId)) {
      continue;
    }

    seenAssetIds.add(assetId);
    const asset = campaignAssets.find((entry) => entry.id === assetId);
    if (!asset || asset.eventId !== input.eventId) {
      return { urls: [], inspirationAssetIds: [], error: "Inspiration file not found." };
    }
    const storagePath = asset.storagePath;
    const url = resolveAssetImageUrl(storagePath);
    if (!url) {
      return { urls: [], inspirationAssetIds: [], error: "Inspiration file is not ready yet." };
    }

    urls.push(url);
    inspirationAssetIds.push(asset.id);
  }

  let uploadIndex = 0;
  for (const inspirationFile of input.inspirationFiles) {
    uploadIndex += 1;
    const bytes = Buffer.from(await inspirationFile.arrayBuffer());
    const storagePath = buildReferenceStoragePath(
      input.eventId,
      input.batchId,
      inspirationFile.name || "inspiration.png",
      uploadIndex,
    );
    const uploaded = await uploadArtworkBytes({
      storagePath,
      bytes,
      contentType: inspirationFile.type || "image/png",
    });

    if (!uploaded.success || !uploaded.publicUrl) {
      return {
        urls: [],
        inspirationAssetIds: [],
        error: uploaded.error ?? "Unable to upload inspiration image.",
      };
    }

    urls.push(uploaded.publicUrl);
  }

  return { urls, inspirationAssetIds };
}

function parseInspirationsFromForm(formData: FormData): {
  inspirationEventAssetIds: string[];
  inspirationFiles: File[];
} {
  const inspirationEventAssetIds = formData
    .getAll("inspirationEventAssetId")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const inspirationFiles = formData
    .getAll("inspirationFile")
    .filter((field): field is File => field instanceof File && field.size > 0);

  return { inspirationEventAssetIds, inspirationFiles };
}

export async function generateArtworkV2Action(
  eventId: string,
  formData: FormData,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "");
  const { inspirationEventAssetIds, inspirationFiles } = parseInspirationsFromForm(formData);

  if (!workflowItemId) {
    return { success: false, error: "Artwork type is required." };
  }

  const userPrompt = resolveFinalArtworkImagePrompt(prompt);
  if (!userPrompt) {
    return { success: false, error: MANUAL_PROMPT_REQUIRED_MESSAGE };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const { item, assetId } = resolved;
  const imageSizePreset = resolveArtworkV2ImageSizePreset(item);
  const batchId = createConceptBatchId();

  const reference = await resolveReferenceImageUrls({
    eventId,
    batchId,
    inspirationEventAssetIds,
    inspirationFiles,
  });

  if (reference.error) {
    return { success: false, error: reference.error };
  }

  const settingsToSave = {
    ...DEFAULT_GENERATION_SETTINGS,
    imageSizePreset,
    customPromptOverride: userPrompt,
    inspirationAssetId: reference.inspirationAssetIds[0] ?? null,
    inspirationStrength: reference.urls.length > 0
      ? ("light" as const)
      : DEFAULT_GENERATION_SETTINGS.inspirationStrength,
    supportInspirationAssetIds: reference.inspirationAssetIds.slice(1),
    inspirationStyleProfile: null,
    textPlan: null,
    additionalInstructions: "",
    negativeInstructions: "",
    style: "",
  };

  await setAssetPlanStatusInProgress(eventId, assetId);
  await saveGenerationSettings(eventId, assetId, settingsToSave, userPrompt);

  const generationMode = parseArtworkGenerationModeFromForm(formData);
  const generationProfile = resolveArtworkGenerationProfile(generationMode);

  const generation = await runArtworkV2Generation({
    eventId,
    assetId,
    assetType: item.assetType,
    imageSizePreset,
    userManualPrompt: userPrompt,
    orchestration: {
      kind: "create",
      userPrompt,
      inspirationImageUrls: reference.urls,
    },
    inspirationAssetId: reference.inspirationAssetIds[0] ?? null,
    generationProfile,
  });

  if (!generation.success) {
    return {
      success: false,
      error: generation.error,
      userPrompt,
      orchestratedPrompt: generation.orchestratedPrompt,
    };
  }

  revalidateArtworkV2Paths(eventId);

  return {
    success: true,
    error: null,
    warning: generation.warning,
    userPrompt,
    orchestratedPrompt: generation.orchestratedPrompt,
    assetId,
    versions: generation.versions,
  };
}

/** After feed artwork is approved, generate a 9:16 story version from the same design. */
export async function generateStoryFromFeedAction(
  eventId: string,
  relativeDay: number,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const phaseItems = getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
    communicationSteps: await getEventCommunicationSteps(eventId),
  });

  const feedItem = findMilestoneFeedItem(phaseItems, relativeDay);
  const storyItem = findMilestoneStoryItem(phaseItems, relativeDay);

  if (!feedItem || !storyItem) {
    return { success: false, error: "Milestone artwork not found for this event." };
  }

  const assets = await getCampaignAssetsForEvent(eventId);
  const feedAsset = resolveWorkflowAsset(feedItem, null, assets);

  if (!isApprovedArtworkAsset(feedAsset) || !feedAsset?.storagePath || !feedAsset.id) {
    return { success: false, error: "Approve the feed artwork before generating the story." };
  }

  const storyAsset = resolveWorkflowAsset(storyItem, null, assets);
  if (isApprovedArtworkAsset(storyAsset)) {
    return { success: false, error: "Story artwork is already approved." };
  }

  const feedUrl = resolveAssetImageUrl(feedAsset.storagePath);
  if (!feedUrl) {
    return { success: false, error: "Feed artwork image not found." };
  }

  const userPrompt = buildDefaultArtworkPrompt({
    event,
    organizationName: (await getLatestOrganization())?.name ?? null,
    item: storyItem,
    hasInspiration: true,
  });
  const resolved = await resolveWorkflowItem(eventId, storyItem.id);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const { item, assetId } = resolved;
  const imageSizePreset = resolveArtworkV2ImageSizePreset(item);

  const settingsToSave = {
    ...DEFAULT_GENERATION_SETTINGS,
    imageSizePreset,
    customPromptOverride: userPrompt,
    inspirationAssetId: feedAsset.id,
    inspirationStrength: "light" as const,
    supportInspirationAssetIds: [],
    inspirationStyleProfile: null,
    textPlan: null,
    additionalInstructions: "",
    negativeInstructions: "",
    style: "",
  };

  await setAssetPlanStatusInProgress(eventId, assetId);
  await saveGenerationSettings(eventId, assetId, settingsToSave, userPrompt);

  const generation = await runArtworkV2Generation({
    eventId,
    assetId,
    assetType: item.assetType,
    imageSizePreset,
    userManualPrompt: userPrompt,
    orchestration: {
      kind: "create",
      userPrompt,
      inspirationImageUrls: [feedUrl],
    },
    inspirationAssetId: feedAsset.id,
    generationProfile: resolveArtworkGenerationProfile("quick"),
  });

  if (!generation.success) {
    return {
      success: false,
      error: generation.error,
      userPrompt,
      orchestratedPrompt: generation.orchestratedPrompt,
    };
  }

  revalidateArtworkV2Paths(eventId);

  return {
    success: true,
    error: null,
    warning: generation.warning,
    userPrompt,
    orchestratedPrompt: generation.orchestratedPrompt,
    assetId,
    versions: generation.versions,
  };
}

export async function approveArtworkV2Action(
  eventId: string,
  conceptId: string,
  workflowItemId: string,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to approve artwork." };
  }

  const concept = await getConceptById(conceptId);
  if (!concept || concept.eventId !== eventId) {
    return { success: false, error: "Artwork version not found." };
  }

  if (concept.status !== "pending") {
    return { success: false, error: "Only pending versions can be approved." };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  if (concept.eventAssetId !== resolved.assetId) {
    return { success: false, error: "Artwork version does not match this campaign item." };
  }

  const uploadedBy = await uploadedByLabel();
  const activated = await activateConceptAsAsset({
    eventId,
    assetId: resolved.assetId,
    concept,
    uploadedBy,
  });

  if (!activated) {
    return { success: false, error: "Unable to approve artwork." };
  }

  await maybePromoteApprovedArtworkToHero({
    eventId,
    storagePath: concept.storagePath,
    filename: concept.filename,
    generationPrompt: concept.generationPrompt,
    uploadedBy,
  });

  await syncMetaPublicationSlots(eventId);

  revalidateArtworkV2Paths(eventId);
  return {
    success: true,
    error: null,
    approvedImageUrl: resolveAssetImageUrl(concept.storagePath),
  };
}

export async function denyArtworkV2Action(
  eventId: string,
  conceptId: string,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to deny artwork." };
  }

  const concept = await getConceptById(conceptId);
  if (!concept || concept.eventId !== eventId) {
    return { success: false, error: "Artwork version not found." };
  }

  if (concept.status === "approved") {
    return { success: false, error: "Approved artwork cannot be denied." };
  }

  const deleted = await deleteConceptRow(conceptId);
  if (!deleted) {
    const discarded = await discardConcept(conceptId);
    if (!discarded) {
      return { success: false, error: "Unable to remove artwork version." };
    }
  }

  revalidateArtworkV2Paths(eventId);
  return { success: true, error: null };
}

export async function adjustArtworkV2Action(
  eventId: string,
  formData: FormData,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to adjust artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const userPrompt = resolveFinalArtworkImagePrompt(String(formData.get("originalPrompt") ?? ""));
  const adjustmentComments = String(formData.get("adjustmentComments") ?? "").trim();
  const versionId = String(formData.get("versionId") ?? "").trim();
  const { inspirationEventAssetIds, inspirationFiles } = parseInspirationsFromForm(formData);

  if (!workflowItemId) {
    return { success: false, error: "Artwork type is required." };
  }

  if (!userPrompt) {
    return { success: false, error: MANUAL_PROMPT_REQUIRED_MESSAGE };
  }

  if (!adjustmentComments) {
    return { success: false, error: "Tell us what you'd like changed first." };
  }

  if (!versionId) {
    return { success: false, error: "Select a version to adjust." };
  }

  const previousConcept = await getConceptById(versionId);
  if (!previousConcept || previousConcept.eventId !== eventId) {
    return { success: false, error: "Artwork version not found." };
  }

  if (!previousConcept.storagePath) {
    return { success: false, error: "Selected artwork image is not available." };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  if (previousConcept.eventAssetId !== resolved.assetId) {
    return { success: false, error: "Artwork version does not match this campaign item." };
  }

  const { item, assetId } = resolved;
  const imageSizePreset = resolveArtworkV2ImageSizePreset(item);
  const batchId = createConceptBatchId();

  const reference = await resolveReferenceImageUrls({
    eventId,
    batchId,
    inspirationEventAssetIds,
    inspirationFiles,
  });

  if (reference.error) {
    return { success: false, error: reference.error };
  }

  const generationMode = parseArtworkGenerationModeFromForm(formData);
  const generationProfile = resolveArtworkGenerationProfile(generationMode);

  const generation = await runArtworkV2Generation({
    eventId,
    assetId,
    assetType: item.assetType,
    imageSizePreset,
    userManualPrompt: userPrompt,
    orchestration: {
      kind: "adjust",
      userPrompt,
      adjustmentComments,
      previousImageUrl: previousConcept.storagePath,
      inspirationImageUrls: reference.urls,
    },
    inspirationAssetId: reference.inspirationAssetIds[0] ?? null,
    generationProfile,
  });

  if (!generation.success) {
    return {
      success: false,
      error: generation.error,
      userPrompt,
      orchestratedPrompt: generation.orchestratedPrompt,
    };
  }

  revalidateArtworkV2Paths(eventId);

  return {
    success: true,
    error: null,
    warning: generation.warning,
    userPrompt,
    orchestratedPrompt: generation.orchestratedPrompt,
    assetId,
    versions: generation.versions,
  };
}

function buildApprovedArtworkStoragePath(
  eventId: string,
  assetType: string,
  filename: string,
): string {
  const safeName = sanitizeEventAssetFilename(filename);
  return `${eventId}/${assetType}/approved/${Date.now()}-${safeName}`;
}

export async function approveInspirationAsArtworkV2Action(
  eventId: string,
  formData: FormData,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to approve artwork." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const { inspirationEventAssetIds, inspirationFiles } = parseInspirationsFromForm(formData);

  if (!workflowItemId) {
    return { success: false, error: "Artwork type is required." };
  }

  if (inspirationEventAssetIds.length + inspirationFiles.length !== 1) {
    return {
      success: false,
      error: "Choose one inspiration image to use as approved artwork.",
    };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const uploadedBy = await uploadedByLabel();
  let storagePath: string | null = null;
  let filename = "approved-artwork.png";
  let generationPrompt = "Approved from inspiration image.";

  if (inspirationEventAssetIds.length === 1) {
    const assets = await getCampaignAssetsForEvent(eventId);
    const sourceAsset = assets.find((entry) => entry.id === inspirationEventAssetIds[0]);

    if (!sourceAsset?.storagePath) {
      return { success: false, error: "Inspiration file not found." };
    }

    storagePath = sourceAsset.storagePath;
    filename = sourceAsset.filename ?? filename;
    generationPrompt = `Approved from ${sourceAsset.planLabel ?? sourceAsset.filename ?? "inspiration"}.`;
  } else {
    const inspirationFile = inspirationFiles[0]!;
    const bytes = Buffer.from(await inspirationFile.arrayBuffer());
    storagePath = buildApprovedArtworkStoragePath(
      eventId,
      resolved.item.assetType,
      inspirationFile.name || filename,
    );
    filename = sanitizeEventAssetFilename(inspirationFile.name || filename);

    const uploaded = await uploadArtworkBytes({
      storagePath,
      bytes,
      contentType: inspirationFile.type || "image/png",
    });

    if (!uploaded.success || !uploaded.publicUrl) {
      return {
        success: false,
        error: uploaded.error ?? "Unable to upload inspiration image.",
      };
    }

    storagePath = uploaded.publicUrl;
    generationPrompt = "Approved from uploaded inspiration image.";
  }

  const activated = await activateExternalArtworkOnAsset({
    eventId,
    assetId: resolved.assetId,
    storagePath,
    filename,
    uploadedBy,
    generationPrompt,
    aiGenerated: false,
  });

  if (!activated) {
    return { success: false, error: "Unable to approve inspiration as artwork." };
  }

  await maybePromoteApprovedArtworkToHero({
    eventId,
    storagePath,
    filename,
    generationPrompt,
    uploadedBy,
  });

  await syncMetaPublicationSlots(eventId);
  revalidateArtworkV2Paths(eventId);

  return {
    success: true,
    error: null,
    approvedImageUrl: resolveAssetImageUrl(storagePath),
  };
}

export async function importCanvaDesignAsArtworkV2Action(
  eventId: string,
  workflowItemId: string,
  designId: string,
): Promise<ArtworkV2GenerationResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to import artwork." };
  }

  const connection = await getCanvaConnectionForCurrentOrg();
  if (!isCanvaConnectionConfigured(connection)) {
    return {
      success: false,
      error: "Connect Canva in Settings first.",
    };
  }

  const accessToken = await getValidCanvaAccessToken(connection);
  if (!accessToken) {
    return {
      success: false,
      error: "Canva session expired. Reconnect in Settings → Canva.",
    };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const exported = await exportCanvaDesignAsPng(accessToken, designId, resolved.item);
  if ("error" in exported) {
    return { success: false, error: exported.error };
  }

  const storagePath = buildApprovedArtworkStoragePath(
    eventId,
    resolved.item.assetType,
    exported.filename,
  );

  const uploaded = await uploadArtworkBytes({
    storagePath,
    bytes: exported.bytes,
    contentType: "image/png",
  });

  if (!uploaded.success || !uploaded.publicUrl) {
    return {
      success: false,
      error: uploaded.error ?? "Unable to store imported Canva artwork.",
    };
  }

  const uploadedBy = await uploadedByLabel();
  const generationPrompt = `Imported from Canva design ${designId}.`;

  const activated = await activateExternalArtworkOnAsset({
    eventId,
    assetId: resolved.assetId,
    storagePath: uploaded.publicUrl,
    filename: exported.filename,
    uploadedBy,
    generationPrompt,
    aiGenerated: false,
  });

  if (!activated) {
    return { success: false, error: "Unable to approve imported Canva artwork." };
  }

  await maybePromoteApprovedArtworkToHero({
    eventId,
    storagePath: uploaded.publicUrl,
    filename: exported.filename,
    generationPrompt,
    uploadedBy,
  });

  await syncMetaPublicationSlots(eventId);
  revalidateArtworkV2Paths(eventId);

  return {
    success: true,
    error: null,
    approvedImageUrl: resolveAssetImageUrl(uploaded.publicUrl),
  };
}
