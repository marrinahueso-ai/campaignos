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
import { getConceptById, getPendingConceptsForAsset } from "@/lib/ai-artwork/queries";
import { isArtworkGenerationConfigured } from "@/lib/ai-artwork/provider";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { activateConceptAsAsset, snapshotAssetToVersion } from "@/lib/ai-artwork/versions";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { hasPermission } from "@/lib/access-templates/effective-access";
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
  groupArtworkPhasesByMilestone,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { buildDefaultArtworkPrompt } from "@/lib/artwork-v2/event-prompt";
import {
  findMilestoneFeedItem,
  findMilestoneStoryItem,
} from "@/lib/artwork-v2/milestone-workflow";
import {
  findAnchorInspirationFeedAsset,
  getRemainingArtworkMilestones,
} from "@/lib/artwork-v2/batch-generate";
import {
  ARTWORK_V2_MAX_INSPIRATION_IMAGES,
  normalizeReviewVersionIndices,
} from "@/lib/artwork-v2/constants";
import {
  parseArtworkGenerationModeFromForm,
  resolveArtworkGenerationProfile,
} from "@/lib/artwork-v2/generation-mode";
import { runArtworkV2Generation } from "@/lib/artwork-v2/generation";
import { activateExternalArtworkOnAsset } from "@/lib/artwork-v2/activation";
import { maybePromoteApprovedArtworkToHero } from "@/lib/artwork-v2/hero";
import { resolveArtworkV2ImageSizePreset } from "@/lib/artwork-v2/image-size";
import {
  resolveMilestoneFeedAsset,
  resolveMilestoneStoryAsset,
  storyDuplicatedFeedArtwork,
} from "@/lib/artwork-v2/milestone-assets";
import { createClient } from "@/lib/supabase/server";
import type {
  ArtworkV2BatchGenerationResult,
  ArtworkV2BatchMilestoneResult,
  ArtworkV2GenerationResult,
  ArtworkV2ReviewVersion,
} from "@/lib/artwork-v2/types";
import {
  getCanvaConnectionForCurrentOrg,
  getValidCanvaAccessToken,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { exportCanvaDesignAsPng } from "@/lib/canva/import-design";
import type { EventAsset } from "@/types/event-workspace";

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

/** Clears a story slot that was incorrectly approved with the feed image (same storage path or row). */
async function resetStoryAssetIfDuplicatingFeed(
  eventId: string,
  feedItem: ReturnType<typeof findMilestoneFeedItem>,
  storyItem: ReturnType<typeof findMilestoneStoryItem>,
): Promise<boolean> {
  if (!feedItem || !storyItem) {
    return false;
  }

  const assets = await getCampaignAssetsForEvent(eventId);
  const feedAsset = resolveMilestoneFeedAsset(feedItem, assets);
  const storyAsset = resolveMilestoneStoryAsset(storyItem, assets);

  if (!storyAsset || !isApprovedArtworkAsset(storyAsset)) {
    return false;
  }

  if (!storyDuplicatedFeedArtwork(feedAsset, storyAsset)) {
    return false;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("event_asset_id", storyAsset.id)
    .in("status", ["pending", "approved"]);

  const { error } = await supabase
    .from("event_assets")
    .update({
      status: "placeholder",
      storage_path: null,
      filename: null,
      plan_status: "needed",
      updated_at: now,
    })
    .eq("id", storyAsset.id)
    .eq("event_id", eventId);

  return !error;
}

type ArtworkV2ResetMode = "regenerate" | "delete";

async function resetArtworkAssetSlot(
  eventId: string,
  assetId: string,
  mode: ArtworkV2ResetMode,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError || !asset) {
    return { ok: false, error: "Campaign artwork slot not found." };
  }

  if (mode === "delete" && asset.status === "uploaded" && asset.storage_path) {
    const snapshotted = await snapshotAssetToVersion(asset, assetId);
    if (!snapshotted) {
      return {
        ok: false,
        error: "Unable to archive the previous artwork version. Try again.",
      };
    }
  }

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("event_asset_id", assetId)
    .in("status", ["pending", "approved"]);

  if (mode === "regenerate") {
    const { error } = await supabase
      .from("event_assets")
      .update({
        plan_status: "in_progress",
        updated_at: now,
      })
      .eq("id", assetId)
      .eq("event_id", eventId);

    if (error) {
      return { ok: false, error: "Unable to prepare artwork for a new version." };
    }

    return { ok: true };
  }

  const { error } = await supabase
    .from("event_assets")
    .update({
      status: "placeholder",
      storage_path: null,
      filename: null,
      plan_status: "needed",
      ai_generated: false,
      updated_at: now,
    })
    .eq("id", assetId)
    .eq("event_id", eventId);

  if (error) {
    return { ok: false, error: "Unable to delete artwork." };
  }

  return { ok: true };
}

async function resetMilestoneCompanionStorySlot(
  eventId: string,
  item: ArtworkWorkflowItem,
  mode: ArtworkV2ResetMode,
): Promise<{ ok: boolean; error?: string }> {
  if (typeof item.relativeDay !== "number" || item.metaPlacement !== "feed") {
    return { ok: true };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { ok: false, error: "Event not found." };
  }

  const phaseItems = getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
    communicationSteps: await getEventCommunicationSteps(eventId),
  });
  const storyItem = findMilestoneStoryItem(phaseItems, item.relativeDay);
  if (!storyItem) {
    return { ok: true };
  }

  const assets = await getCampaignAssetsForEvent(eventId);
  const storyAsset = resolveWorkflowAsset(storyItem, null, assets);
  if (!storyAsset?.id || !isApprovedArtworkAsset(storyAsset)) {
    return { ok: true };
  }

  return resetArtworkAssetSlot(eventId, storyAsset.id, mode);
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
  inspirationStoragePaths: string[];
}): Promise<{ urls: string[]; inspirationAssetIds: string[]; error?: string }> {
  const totalRequested =
    input.inspirationEventAssetIds.length +
    input.inspirationFiles.length +
    input.inspirationStoragePaths.length;

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

  const seenStoragePaths = new Set<string>();
  for (const storagePath of input.inspirationStoragePaths) {
    if (seenStoragePaths.has(storagePath)) {
      continue;
    }

    seenStoragePaths.add(storagePath);
    const url = resolveAssetImageUrl(storagePath);
    if (!url) {
      return {
        urls: [],
        inspirationAssetIds: [],
        error: "Inspiration file is not ready yet.",
      };
    }

    urls.push(url);
  }

  return { urls, inspirationAssetIds };
}

function parseInspirationsFromForm(formData: FormData): {
  inspirationEventAssetIds: string[];
  inspirationFiles: File[];
  inspirationStoragePaths: string[];
} {
  const inspirationEventAssetIds = formData
    .getAll("inspirationEventAssetId")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const inspirationFiles = formData
    .getAll("inspirationFile")
    .filter((field): field is File => field instanceof File && field.size > 0);

  const inspirationStoragePaths = formData
    .getAll("inspirationStoragePath")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return { inspirationEventAssetIds, inspirationFiles, inspirationStoragePaths };
}

export async function generateArtworkV2Action(
  eventId: string,
  formData: FormData,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to generate artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "");
  const { inspirationEventAssetIds, inspirationFiles, inspirationStoragePaths } =
    parseInspirationsFromForm(formData);

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
    inspirationStoragePaths,
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
  if (!(await hasPermission("upload_artwork"))) {
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
    if (storyDuplicatedFeedArtwork(feedAsset, storyAsset)) {
      await resetStoryAssetIfDuplicatingFeed(eventId, feedItem, storyItem);
    } else {
      return { success: false, error: "Story artwork is already approved." };
    }
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

/** Load pending generated versions for the artwork review screen. */
export async function getArtworkV2ReviewVersionsAction(
  eventId: string,
  workflowItemId: string,
): Promise<{ success: boolean; error: string | null; versions: ArtworkV2ReviewVersion[] }> {
  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error, versions: [] };
  }

  const expectedPreset = resolveArtworkV2ImageSizePreset(resolved.item);
  const pendingConcepts = (await getPendingConceptsForAsset(resolved.assetId)).filter(
    (concept) =>
      !concept.imageSizePreset || concept.imageSizePreset === expectedPreset,
  );
  const versions = normalizeReviewVersionIndices(
    pendingConcepts
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return left.conceptIndex - right.conceptIndex;
      })
      .map((concept) => ({
        id: concept.id,
        index: concept.conceptIndex,
        imageUrl: resolveAssetImageUrl(concept.storagePath),
      })),
  );

  return { success: true, error: null, versions };
}

export async function approveArtworkV2Action(
  eventId: string,
  conceptId: string,
  workflowItemId: string,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
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

  const expectedPreset = resolveArtworkV2ImageSizePreset(resolved.item);
  if (concept.imageSizePreset && concept.imageSizePreset !== expectedPreset) {
    return {
      success: false,
      error: `This version is ${concept.imageSizePreset} format. Approve it from the matching ${expectedPreset} artwork slot.`,
    };
  }

  if (
    typeof resolved.item.relativeDay === "number" &&
    resolved.item.metaPlacement === "story"
  ) {
    const event = await getEventById(eventId);
    const phaseItems = getArtworkPhaseItems({
      eventType: event?.eventType ?? null,
      communicationStrategy: event?.communicationStrategy ?? "full_campaign",
      communicationSteps: await getEventCommunicationSteps(eventId),
    });
    const feedItem = findMilestoneFeedItem(phaseItems, resolved.item.relativeDay);
    if (feedItem) {
      const assets = await getCampaignAssetsForEvent(eventId);
      const feedAsset = resolveMilestoneFeedAsset(feedItem, assets);
      if (
        feedAsset?.storagePath &&
        concept.storagePath === feedAsset.storagePath
      ) {
        return {
          success: false,
          error:
            "This is the feed (1:1) image. Approve a 9:16 story version generated from your feed design.",
        };
      }
    }
  }

  const uploadedBy = await uploadedByLabel();
  const activated = await activateConceptAsAsset({
    eventId,
    assetId: resolved.assetId,
    concept,
    uploadedBy,
  });

  if (!activated.success) {
    return { success: false, error: activated.error };
  }

  const approvedImageUrl = resolveAssetImageUrl(concept.storagePath);

  await maybePromoteApprovedArtworkToHero({
    eventId,
    assetType: resolved.item.assetType,
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
    approvedImageUrl,
  };
}

export async function denyArtworkV2Action(
  eventId: string,
  conceptId: string,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
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

/** Clears approval lock so the user can generate a new version for this slot. */
export async function prepareArtworkV2RegenerationAction(
  eventId: string,
  workflowItemId: string,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to update artwork." };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  if (
    typeof resolved.item.relativeDay === "number" &&
    resolved.item.metaPlacement === "feed"
  ) {
    const companionReset = await resetMilestoneCompanionStorySlot(
      eventId,
      resolved.item,
      "delete",
    );
    if (!companionReset.ok) {
      return { success: false, error: companionReset.error ?? "Unable to reset story artwork." };
    }
  }

  const reset = await resetArtworkAssetSlot(eventId, resolved.assetId, "regenerate");
  if (!reset.ok) {
    return { success: false, error: reset.error ?? "Unable to prepare artwork for a new version." };
  }

  await syncMetaPublicationSlots(eventId);
  revalidateArtworkV2Paths(eventId);
  return { success: true, error: null };
}

/** Deletes approved artwork from a slot so the user can start over. */
export async function resetArtworkV2SlotAction(
  eventId: string,
  workflowItemId: string,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to delete artwork." };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  if (
    typeof resolved.item.relativeDay === "number" &&
    resolved.item.metaPlacement === "feed"
  ) {
    const companionReset = await resetMilestoneCompanionStorySlot(
      eventId,
      resolved.item,
      "delete",
    );
    if (!companionReset.ok) {
      return { success: false, error: companionReset.error ?? "Unable to delete story artwork." };
    }
  }

  const reset = await resetArtworkAssetSlot(eventId, resolved.assetId, "delete");
  if (!reset.ok) {
    return { success: false, error: reset.error ?? "Unable to delete artwork." };
  }

  await syncMetaPublicationSlots(eventId);
  revalidateArtworkV2Paths(eventId);
  return { success: true, error: null };
}

export async function adjustArtworkV2Action(
  eventId: string,
  formData: FormData,
): Promise<ArtworkV2GenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to adjust artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const userPrompt = resolveFinalArtworkImagePrompt(String(formData.get("originalPrompt") ?? ""));
  const adjustmentComments = String(formData.get("adjustmentComments") ?? "").trim();
  const versionId = String(formData.get("versionId") ?? "").trim();
  const { inspirationEventAssetIds, inspirationFiles, inspirationStoragePaths } =
    parseInspirationsFromForm(formData);

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

  const previousImageUrl = resolveAssetImageUrl(previousConcept.storagePath);
  if (!previousImageUrl) {
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
    inspirationStoragePaths,
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
      previousImageUrl,
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
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to approve artwork." };
  }

  const workflowItemId = String(formData.get("workflowItemId") ?? "").trim();
  const { inspirationEventAssetIds, inspirationFiles, inspirationStoragePaths } =
    parseInspirationsFromForm(formData);

  if (!workflowItemId) {
    return { success: false, error: "Artwork type is required." };
  }

  const inspirationSourceCount =
    inspirationEventAssetIds.length +
    inspirationFiles.length +
    inspirationStoragePaths.length;

  if (inspirationSourceCount !== 1) {
    return {
      success: false,
      error: "Choose one inspiration image to use as approved artwork.",
    };
  }

  const resolved = await resolveWorkflowItem(eventId, workflowItemId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  if (
    typeof resolved.item.relativeDay === "number" &&
    resolved.item.metaPlacement === "story" &&
    inspirationEventAssetIds.length === 1
  ) {
    const event = await getEventById(eventId);
    const phaseItems = getArtworkPhaseItems({
      eventType: event?.eventType ?? null,
      communicationStrategy: event?.communicationStrategy ?? "full_campaign",
      communicationSteps: await getEventCommunicationSteps(eventId),
    });
    const feedItem = findMilestoneFeedItem(phaseItems, resolved.item.relativeDay);
    const assets = await getCampaignAssetsForEvent(eventId);
    const feedAsset = feedItem ? resolveMilestoneFeedAsset(feedItem, assets) : null;
    const sourceAsset = assets.find((entry) => entry.id === inspirationEventAssetIds[0]);

    if (feedAsset && sourceAsset && feedAsset.id === sourceAsset.id) {
      return {
        success: false,
        error:
          "Generate a 9:16 story from your approved feed design — the feed image cannot be approved directly as the story.",
      };
    }
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
  } else if (inspirationStoragePaths.length === 1) {
    storagePath = inspirationStoragePaths[0]!;
    filename = sanitizeEventAssetFilename(
      storagePath.split("/").pop() ?? "canva-inspiration.png",
    );
    generationPrompt = "Approved from Canva inspiration.";
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
    assetType: resolved.item.assetType,
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

export async function importCanvaDesignAsInspirationV2Action(
  eventId: string,
  workflowItemId: string,
  designId: string,
  designTitle?: string | null,
): Promise<{
  success: boolean;
  error: string | null;
  reference?: {
    label: string;
    previewUrl: string;
    inspirationStoragePath: string;
  };
}> {
  if (!(await hasPermission("upload_artwork"))) {
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

  const batchId = createConceptBatchId();
  const inspirationStoragePath = buildReferenceStoragePath(
    eventId,
    batchId,
    exported.filename,
    1,
  );

  const uploaded = await uploadArtworkBytes({
    storagePath: inspirationStoragePath,
    bytes: exported.bytes,
    contentType: "image/png",
  });

  if (!uploaded.success || !uploaded.publicUrl) {
    return {
      success: false,
      error: uploaded.error ?? "Unable to store Canva inspiration image.",
    };
  }

  const previewUrl = resolveAssetImageUrl(inspirationStoragePath);
  if (!previewUrl) {
    return { success: false, error: "Imported Canva image is not ready yet." };
  }

  const label = designTitle?.trim() || exported.filename.replace(/\.png$/i, "");

  return {
    success: true,
    error: null,
    reference: {
      label: label ? `Canva: ${label}` : "Canva design",
      previewUrl,
      inspirationStoragePath,
    },
  };
}

async function generateFeedWithInspirationAsset(input: {
  eventId: string;
  feedItem: ArtworkWorkflowItem;
  inspirationAsset: EventAsset;
  event: Awaited<ReturnType<typeof getEventById>>;
  organizationName: string | null;
}): Promise<ArtworkV2GenerationResult> {
  const inspirationUrl = resolveAssetImageUrl(input.inspirationAsset.storagePath);
  if (!inspirationUrl) {
    return { success: false, error: "Style reference image not found." };
  }

  const userPrompt = buildDefaultArtworkPrompt({
    event: input.event!,
    organizationName: input.organizationName,
    item: input.feedItem,
    hasInspiration: true,
  });

  const resolved = await resolveWorkflowItem(input.eventId, input.feedItem.id);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const { item, assetId } = resolved;
  const imageSizePreset = resolveArtworkV2ImageSizePreset(item);

  const settingsToSave = {
    ...DEFAULT_GENERATION_SETTINGS,
    imageSizePreset,
    customPromptOverride: userPrompt,
    inspirationAssetId: input.inspirationAsset.id,
    inspirationStrength: "light" as const,
    supportInspirationAssetIds: [],
    inspirationStyleProfile: null,
    textPlan: null,
    additionalInstructions: "",
    negativeInstructions: "",
    style: "",
  };

  await setAssetPlanStatusInProgress(input.eventId, assetId);
  await saveGenerationSettings(input.eventId, assetId, settingsToSave, userPrompt);

  const generation = await runArtworkV2Generation({
    eventId: input.eventId,
    assetId,
    assetType: item.assetType,
    imageSizePreset,
    userManualPrompt: userPrompt,
    orchestration: {
      kind: "create",
      userPrompt,
      inspirationImageUrls: [inspirationUrl],
    },
    inspirationAssetId: input.inspirationAsset.id,
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

async function generateStoryFromFeedImage(input: {
  eventId: string;
  relativeDay: number;
  feedAssetId: string;
  feedImageUrl: string;
  event: Awaited<ReturnType<typeof getEventById>>;
  organizationName: string | null;
  phaseItems: ReturnType<typeof getArtworkPhaseItems>;
}): Promise<ArtworkV2GenerationResult> {
  const storyItem = findMilestoneStoryItem(input.phaseItems, input.relativeDay);
  if (!storyItem) {
    return { success: false, error: "Story artwork slot not found for this milestone." };
  }

  const assets = await getCampaignAssetsForEvent(input.eventId);
  const feedItem = findMilestoneFeedItem(input.phaseItems, input.relativeDay);
  const feedAsset = feedItem ? resolveMilestoneFeedAsset(feedItem, assets) : null;
  const storyAsset = resolveWorkflowAsset(storyItem, null, assets);
  if (isApprovedArtworkAsset(storyAsset)) {
    if (storyDuplicatedFeedArtwork(feedAsset, storyAsset)) {
      await resetStoryAssetIfDuplicatingFeed(input.eventId, feedItem, storyItem);
    } else {
      return { success: false, error: "Story artwork is already approved." };
    }
  }

  const userPrompt = buildDefaultArtworkPrompt({
    event: input.event!,
    organizationName: input.organizationName,
    item: storyItem,
    hasInspiration: true,
  });

  const resolved = await resolveWorkflowItem(input.eventId, storyItem.id);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const { item, assetId } = resolved;
  const imageSizePreset = resolveArtworkV2ImageSizePreset(item);

  const settingsToSave = {
    ...DEFAULT_GENERATION_SETTINGS,
    imageSizePreset,
    customPromptOverride: userPrompt,
    inspirationAssetId: input.feedAssetId,
    inspirationStrength: "light" as const,
    supportInspirationAssetIds: [],
    inspirationStyleProfile: null,
    textPlan: null,
    additionalInstructions: "",
    negativeInstructions: "",
    style: "",
  };

  await setAssetPlanStatusInProgress(input.eventId, assetId);
  await saveGenerationSettings(input.eventId, assetId, settingsToSave, userPrompt);

  const generation = await runArtworkV2Generation({
    eventId: input.eventId,
    assetId,
    assetType: item.assetType,
    imageSizePreset,
    userManualPrompt: userPrompt,
    orchestration: {
      kind: "create",
      userPrompt,
      inspirationImageUrls: [input.feedImageUrl],
    },
    inspirationAssetId: input.feedAssetId,
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

async function generateRemainingMilestoneArtwork(input: {
  eventId: string;
  relativeDay: number;
  inspirationAsset: EventAsset;
  event: Awaited<ReturnType<typeof getEventById>>;
  organizationName: string | null;
  phaseItems: ReturnType<typeof getArtworkPhaseItems>;
  phase?: "feed" | "story" | "all";
}): Promise<ArtworkV2BatchMilestoneResult> {
  const feedItem = findMilestoneFeedItem(input.phaseItems, input.relativeDay);
  const title =
    groupArtworkPhasesByMilestone(input.phaseItems).find(
      (group) => group.relativeDay === input.relativeDay,
    )?.title ?? `Day ${input.relativeDay}`;

  if (!feedItem) {
    return {
      relativeDay: input.relativeDay,
      title,
      feedVersionIds: [],
      storyVersionIds: [],
      error: "Feed artwork slot not found for this milestone.",
    };
  }

  const assets = await getCampaignAssetsForEvent(input.eventId);
  const feedAsset = resolveWorkflowAsset(feedItem, null, assets);
  const phase = input.phase ?? "all";
  let feedVersionIds: string[] = [];
  let feedImageUrl: string | null = null;
  let feedAssetId: string | null = feedAsset?.id ?? null;

  if (phase === "feed" || phase === "all") {
    if (isApprovedArtworkAsset(feedAsset)) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds: [],
        storyVersionIds: [],
        error: "Feed artwork is already approved.",
      };
    }

    const feedResult = await generateFeedWithInspirationAsset({
      eventId: input.eventId,
      feedItem,
      inspirationAsset: input.inspirationAsset,
      event: input.event,
      organizationName: input.organizationName,
    });

    if (!feedResult.success || !feedResult.versions?.length) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds: [],
        storyVersionIds: [],
        error: feedResult.error ?? "Unable to generate feed artwork.",
      };
    }

    feedVersionIds = feedResult.versions.map((version) => version.id);
    feedImageUrl = feedResult.versions[0]?.imageUrl ?? null;
    feedAssetId = feedResult.assetId ?? feedAssetId;

    if (!feedImageUrl || !feedAssetId) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds,
        storyVersionIds: [],
        error: "Feed artwork was generated but the image is not available yet.",
      };
    }

    if (phase === "feed") {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds,
        storyVersionIds: [],
      };
    }
  }

  if (phase === "story" || phase === "all") {
    const storyItem = findMilestoneStoryItem(input.phaseItems, input.relativeDay);
    if (!storyItem) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds,
        storyVersionIds: [],
      };
    }

    const storyAsset = resolveWorkflowAsset(storyItem, null, assets);
    if (isApprovedArtworkAsset(storyAsset)) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds,
        storyVersionIds: [],
      };
    }

    if (!feedImageUrl || !feedAssetId) {
      if (phase === "story") {
        const refreshedAssets = await getCampaignAssetsForEvent(input.eventId);
        const refreshedFeedAsset = resolveWorkflowAsset(feedItem, null, refreshedAssets);
        feedAssetId = refreshedFeedAsset?.id ?? null;

        if (feedAssetId) {
          const pendingFeedConcepts = await getPendingConceptsForAsset(feedAssetId);
          const latestFeedConcept = pendingFeedConcepts[0];
          feedImageUrl = latestFeedConcept?.storagePath
            ? resolveAssetImageUrl(latestFeedConcept.storagePath)
            : null;
        }

        if (!feedImageUrl && refreshedFeedAsset?.storagePath) {
          feedImageUrl = resolveAssetImageUrl(refreshedFeedAsset.storagePath);
        }
      }

      if (!feedImageUrl || !feedAssetId) {
        return {
          relativeDay: input.relativeDay,
          title,
          feedVersionIds,
          storyVersionIds: [],
          error: "Generate the feed artwork before creating the story version.",
        };
      }
    }

    const storyResult = await generateStoryFromFeedImage({
      eventId: input.eventId,
      relativeDay: input.relativeDay,
      feedAssetId,
      feedImageUrl,
      event: input.event,
      organizationName: input.organizationName,
      phaseItems: input.phaseItems,
    });

    if (!storyResult.success) {
      return {
        relativeDay: input.relativeDay,
        title,
        feedVersionIds,
        storyVersionIds: [],
        error: storyResult.error ?? "Feed created, but story generation failed.",
      };
    }

    return {
      relativeDay: input.relativeDay,
      title,
      feedVersionIds,
      storyVersionIds: (storyResult.versions ?? []).map((version) => version.id),
    };
  }

  return {
    relativeDay: input.relativeDay,
    title,
    feedVersionIds,
    storyVersionIds: [],
  };
}

/** Generate feed + story artwork for remaining milestones using an approved feed as style reference. */
export async function generateRemainingArtworkV2Action(
  eventId: string,
  options?: {
    anchorRelativeDay?: number;
    relativeDay?: number;
    phase?: "feed" | "story" | "all";
  },
): Promise<ArtworkV2BatchGenerationResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return {
      success: false,
      error: "You do not have permission to generate artwork.",
      milestones: [],
    };
  }

  if (!isArtworkGenerationConfigured()) {
    return {
      success: false,
      error: "AI artwork generation is not configured.",
      milestones: [],
    };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found.", milestones: [] };
  }

  const communicationSteps = await getEventCommunicationSteps(eventId);
  const phaseItems = getArtworkPhaseItems({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
    communicationSteps,
  });

  if (phaseItems.length === 0) {
    return {
      success: false,
      error: "This campaign does not use milestone artwork.",
      milestones: [],
    };
  }

  const assets = await getCampaignAssetsForEvent(eventId);
  const inspirationAsset = findAnchorInspirationFeedAsset(
    phaseItems,
    assets,
    options?.anchorRelativeDay,
  );

  if (!inspirationAsset) {
    return {
      success: false,
      error: "Approve at least one milestone feed artwork before generating the rest.",
      milestones: [],
    };
  }

  const organizationName = (await getLatestOrganization())?.name ?? null;
  const remaining = getRemainingArtworkMilestones(phaseItems, assets).filter((milestone) =>
    options?.relativeDay != null ? milestone.relativeDay === options.relativeDay : true,
  );

  if (remaining.length === 0) {
    return {
      success: false,
      error: "No remaining milestones need artwork.",
      milestones: [],
    };
  }

  const milestones: ArtworkV2BatchMilestoneResult[] = [];

  for (const milestone of remaining) {
    milestones.push(
      await generateRemainingMilestoneArtwork({
        eventId,
        relativeDay: milestone.relativeDay,
        inspirationAsset,
        event,
        organizationName,
        phaseItems,
        phase: options?.phase,
      }),
    );
  }

  revalidateArtworkV2Paths(eventId);

  const hasFailures = milestones.some((entry) => entry.error);
  return {
    success: !hasFailures,
    error: hasFailures ? "Some milestones could not be generated." : null,
    milestones,
  };
}
