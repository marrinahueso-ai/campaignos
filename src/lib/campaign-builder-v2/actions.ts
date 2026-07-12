"use server";

/**
 * Campaign Builder V2 server actions.
 * Artwork uses artwork-v2 orchestrator; captions use the shared AI text provider.
 */

import { revalidatePath } from "next/cache";
import { suggestMilestonesFromContext } from "@/lib/campaign-builder-v2/suggest-milestones";
import { sendCampaignBuilderForApproval } from "@/lib/campaign-builder-v2/approval-bridge";
import { validateBeforeGeneration } from "@/lib/campaign-builder-v2/validation";
import {
  artworkKeyForView,
  enabledArtworkViews,
  emptyMilestoneArtwork,
  isPlaceholderArtworkUrl,
} from "@/lib/campaign-builder-v2/platform-utils";
import {
  generateCampaignBuilderArtwork,
  generateCampaignBuilderCaption,
} from "@/lib/campaign-builder-v2/generation";
import { syncCaptionsToPlatforms } from "@/lib/campaign-builder-v2/caption-utils";
import {
  syncHeroFromAllMilestoneArtwork,
  syncHeroFromMilestoneArtwork,
} from "@/lib/campaign-builder-v2/hero-sync";
import { persistInspirationImages } from "@/lib/campaign-builder-v2/inspiration-storage";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  InspirationImagePayload,
  MilestoneArtwork,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  PlatformCaption,
} from "@/lib/campaign-builder-v2/types";

export interface RegenerateArtworkInput {
  eventId: string;
  milestoneId: string;
  view: ArtworkView;
  instructions: string;
  styleStrength: number;
  brandKitId: string | null;
  useBrandKit: boolean;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  currentImageUrl: string | null;
  inspirationImages?: InspirationImagePayload[];
}

export interface RegenerateCaptionInput {
  eventId: string;
  milestoneId: string;
  platform: "facebook" | "instagram";
  instructions: string;
  tone: string;
  currentCaption: string;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  artworkImageUrl?: string | null;
  playbookName?: string | null;
}

export interface RegenerateArtworkResult {
  success: boolean;
  variationUrls: string[];
  message: string;
}

export interface RegenerateCaptionResult {
  success: boolean;
  caption: string;
  message: string;
}

export interface GenerateAllContentInput {
  eventId: string;
  inspiration: CampaignBuilderInspiration;
  inspirationImages?: InspirationImagePayload[];
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
  brandKitId: string | null;
  useBrandKit: boolean;
  /** When set, only these milestones are generated (no cross-milestone mixing). */
  milestoneIds?: string[];
  playbookName?: string | null;
}

export interface GenerateAllContentMilestoneResult {
  milestoneId: string;
  artwork: MilestoneArtwork;
  captions: PlatformCaption[];
  status: MilestonePreviewContent["status"];
  generationStatus: MilestoneGenerationStatus;
}

export interface GenerateAllContentResult {
  success: boolean;
  results: GenerateAllContentMilestoneResult[];
  message: string;
  updatedInspiration?: CampaignBuilderInspiration;
}

async function resolveInspirationForGeneration(
  eventId: string,
  inspiration: CampaignBuilderInspiration,
  inspirationImages?: InspirationImagePayload[],
): Promise<{
  inspiration: CampaignBuilderInspiration;
  inspirationImageUrls: string[];
  error?: string;
}> {
  const images = inspirationImages ?? inspiration.inspirationImages;
  const persisted = await persistInspirationImages(eventId, images);

  if (persisted.error) {
    return {
      inspiration,
      inspirationImageUrls: [],
      error: persisted.error,
    };
  }

  return {
    inspiration: {
      ...inspiration,
      inspirationImages: persisted.updatedImages,
    },
    inspirationImageUrls: persisted.urls,
  };
}

async function generateArtworkForMilestone(input: {
  eventId: string;
  milestone: CampaignBuilderMilestone;
  enabledFormats: CampaignBuilderMilestone["platformFormats"];
  inspiration: CampaignBuilderInspiration;
  inspirationImageUrls: string[];
  brandKitId: string | null;
  useBrandKit: boolean;
  existingArtwork?: MilestoneArtwork;
  forceRegenerate?: boolean;
  extraInstructions?: string | null;
  styleStrength?: number;
}): Promise<{
  success: boolean;
  artwork: MilestoneArtwork;
  message?: string;
}> {
  const artworkViews = enabledArtworkViews(input.enabledFormats);
  const artwork: MilestoneArtwork = {
    ...(input.existingArtwork ?? emptyMilestoneArtwork()),
  };

  for (const view of artworkViews) {
    const artworkKey = artworkKeyForView(view);
    const existingUrl = artwork[artworkKey];
    const shouldGenerate =
      input.forceRegenerate ||
      !existingUrl ||
      isPlaceholderArtworkUrl(existingUrl);

    if (!shouldGenerate) {
      continue;
    }

    const storyFromFeed = view === "story" && Boolean(artwork.feedUrl);
    const feedUrl = artwork.feedUrl;
    const isAdjust =
      view === "feed" &&
      Boolean(existingUrl?.trim()) &&
      !isPlaceholderArtworkUrl(existingUrl) &&
      Boolean(input.extraInstructions?.trim());

    const artworkResult = await generateCampaignBuilderArtwork({
      eventId: input.eventId,
      milestone: input.milestone,
      view,
      inspiration: input.inspiration,
      inspirationImageUrls: input.inspirationImageUrls,
      brandKitId: input.brandKitId,
      useBrandKit: input.useBrandKit,
      styleStrength: input.styleStrength,
      extraInstructions: isAdjust ? null : input.extraInstructions?.trim() || null,
      adjustmentComments: isAdjust ? input.extraInstructions?.trim() : null,
      previousImageUrl: isAdjust ? existingUrl : storyFromFeed ? feedUrl : null,
      storyFromFeed,
      versionCount: 1,
    });

    if (!artworkResult.success || artworkResult.variationUrls.length === 0) {
      return {
        success: false,
        artwork,
        message:
          artworkResult.message ||
          `Could not generate ${view} artwork for "${input.milestone.name}".`,
      };
    }

    artwork[artworkKey] = artworkResult.variationUrls[0] ?? null;
  }

  return { success: true, artwork };
}

export interface GenerateMilestoneArtworkInput {
  eventId: string;
  milestoneId: string;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  milestones: CampaignBuilderMilestone[];
  previewContent: MilestonePreviewContent;
  brandKitId: string | null;
  useBrandKit: boolean;
  inspirationImages?: InspirationImagePayload[];
}

export interface GenerateMilestoneArtworkResult {
  success: boolean;
  artwork: MilestoneArtwork;
  message: string;
  updatedInspiration?: CampaignBuilderInspiration;
}

export async function generateMilestoneArtworkAction(
  input: GenerateMilestoneArtworkInput,
): Promise<GenerateMilestoneArtworkResult> {
  const resolved = await resolveInspirationForGeneration(
    input.eventId,
    input.inspiration,
    input.inspirationImages,
  );

  if (resolved.error) {
    return {
      success: false,
      artwork: input.previewContent.artwork,
      message: resolved.error,
    };
  }

  const generation = await generateArtworkForMilestone({
    eventId: input.eventId,
    milestone: input.milestone,
    enabledFormats: input.previewContent.enabledFormats,
    inspiration: resolved.inspiration,
    inspirationImageUrls: resolved.inspirationImageUrls,
    brandKitId: input.brandKitId,
    useBrandKit: input.useBrandKit,
    existingArtwork: input.previewContent.artwork,
    forceRegenerate: true,
  });

  if (generation.success) {
    await syncHeroFromMilestoneArtwork({
      eventId: input.eventId,
      milestones: input.milestones,
      milestoneId: input.milestoneId,
      artwork: generation.artwork,
    });
  }

  return {
    success: generation.success,
    artwork: generation.artwork,
    message:
      generation.message ??
      (generation.success
        ? "Artwork generated for this milestone."
        : "Artwork generation failed."),
    updatedInspiration: resolved.inspiration,
  };
}

export async function regenerateArtworkAction(
  input: RegenerateArtworkInput,
): Promise<RegenerateArtworkResult> {
  const resolved = await resolveInspirationForGeneration(
    input.eventId,
    input.inspiration,
    input.inspirationImages,
  );

  if (resolved.error) {
    return {
      success: false,
      variationUrls: [],
      message: resolved.error,
    };
  }

  const isAdjust = Boolean(
    input.currentImageUrl?.trim() &&
      !isPlaceholderArtworkUrl(input.currentImageUrl) &&
      input.instructions.trim(),
  );
  const result = await generateCampaignBuilderArtwork({
    eventId: input.eventId,
    milestone: input.milestone,
    view: input.view,
    inspiration: resolved.inspiration,
    inspirationImageUrls: resolved.inspirationImageUrls,
    brandKitId: input.brandKitId,
    useBrandKit: input.useBrandKit,
    styleStrength: input.styleStrength,
    extraInstructions: isAdjust ? null : input.instructions.trim() || null,
    adjustmentComments: isAdjust ? input.instructions.trim() : null,
    previousImageUrl: isAdjust ? input.currentImageUrl : null,
    storyFromFeed: false,
    versionCount: 1,
  });

  return {
    success: result.success,
    variationUrls: result.variationUrls,
    message: result.message,
  };
}

export interface RegenerateMilestoneArtworkInput {
  eventId: string;
  milestoneId: string;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  milestones: CampaignBuilderMilestone[];
  previewContent: MilestonePreviewContent;
  instructions: string;
  styleStrength: number;
  brandKitId: string | null;
  useBrandKit: boolean;
  inspirationImages?: InspirationImagePayload[];
}

export async function regenerateMilestoneArtworkAction(
  input: RegenerateMilestoneArtworkInput,
): Promise<GenerateMilestoneArtworkResult> {
  const resolved = await resolveInspirationForGeneration(
    input.eventId,
    input.inspiration,
    input.inspirationImages,
  );

  if (resolved.error) {
    return {
      success: false,
      artwork: input.previewContent.artwork,
      message: resolved.error,
    };
  }

  const generation = await generateArtworkForMilestone({
    eventId: input.eventId,
    milestone: input.milestone,
    enabledFormats: input.previewContent.enabledFormats,
    inspiration: resolved.inspiration,
    inspirationImageUrls: resolved.inspirationImageUrls,
    brandKitId: input.brandKitId,
    useBrandKit: input.useBrandKit,
    existingArtwork: input.previewContent.artwork,
    forceRegenerate: true,
    extraInstructions: input.instructions.trim() || null,
    styleStrength: input.styleStrength,
  });

  return {
    success: generation.success,
    artwork: generation.artwork,
    message:
      generation.message ??
      (generation.success
        ? "Feed and story artwork regenerated."
        : "Artwork regeneration failed."),
    updatedInspiration: resolved.inspiration,
  };
}

export async function regenerateCaptionAction(
  input: RegenerateCaptionInput,
): Promise<RegenerateCaptionResult> {
  const result = await generateCampaignBuilderCaption({
    eventId: input.eventId,
    inspiration: input.inspiration,
    milestone: input.milestone,
    platform: input.platform,
    instructions: input.instructions,
    tone: input.tone,
    currentCaption: input.currentCaption,
    artworkImageUrl: input.artworkImageUrl,
    playbookName: input.playbookName ?? null,
  });

  return {
    success: result.success,
    caption: result.caption,
    message: result.message,
  };
}

export async function generateAllContentAction(
  input: GenerateAllContentInput,
): Promise<GenerateAllContentResult> {
  const validation = validateBeforeGeneration({
    inspiration: input.inspiration,
    milestones: input.milestones,
    milestoneIds: input.milestoneIds,
  });

  if (!validation.valid) {
    return {
      success: false,
      results: [],
      message: validation.message ?? "Complete required fields before generating.",
    };
  }

  const targetMilestones = input.milestoneIds?.length
    ? input.milestones.filter((milestone) =>
        input.milestoneIds!.includes(milestone.id),
      )
    : input.milestones;

  try {
    const resolved = await resolveInspirationForGeneration(
      input.eventId,
      input.inspiration,
      input.inspirationImages,
    );

    if (resolved.error) {
      return {
        success: false,
        results: [],
        message: resolved.error,
      };
    }

    const results: GenerateAllContentMilestoneResult[] = [];

    for (const milestone of targetMilestones) {
      const preview =
        input.previewContents.find((content) => content.milestoneId === milestone.id) ??
        null;
      const enabledFormats = preview?.enabledFormats ?? milestone.platformFormats;

      const artworkGeneration = await generateArtworkForMilestone({
        eventId: input.eventId,
        milestone,
        enabledFormats,
        inspiration: resolved.inspiration,
        inspirationImageUrls: resolved.inspirationImageUrls,
        brandKitId: input.brandKitId,
        useBrandKit: input.useBrandKit,
        existingArtwork: preview?.artwork,
        forceRegenerate: false,
      });

      if (!artworkGeneration.success) {
        return {
          success: false,
          results: [],
          message:
            artworkGeneration.message ||
            `Could not generate artwork for "${milestone.name}".`,
          updatedInspiration: resolved.inspiration,
        };
      }

      const artwork = artworkGeneration.artwork;
      const artworkViews = enabledArtworkViews(enabledFormats);

      const feedArtworkUrl = artwork.feedUrl ?? artwork.storyUrl;

      const hasExistingCaptions = (preview?.captions ?? []).some((caption) =>
        caption.text.trim(),
      );

      let captions = preview?.captions ?? syncCaptionsToPlatforms("", milestone.platforms);

      if (!hasExistingCaptions) {
        const captionResult = await generateCampaignBuilderCaption({
          eventId: input.eventId,
          inspiration: resolved.inspiration,
          milestone,
          platform: milestone.platforms[0] ?? "facebook",
          artworkImageUrl: feedArtworkUrl,
          playbookName: input.playbookName ?? null,
        });

        if (!captionResult.success) {
          return {
            success: false,
            results: [],
            message:
              captionResult.message ||
              `Could not generate caption for "${milestone.name}".`,
            updatedInspiration: resolved.inspiration,
          };
        }

        captions = syncCaptionsToPlatforms(
          captionResult.caption,
          milestone.platforms,
        );
      }

      const hasArtwork =
        (Boolean(artwork.feedUrl) && !isPlaceholderArtworkUrl(artwork.feedUrl)) ||
        (Boolean(artwork.storyUrl) && !isPlaceholderArtworkUrl(artwork.storyUrl));
      const hasCaptions = captions.some((caption) => caption.text.trim().length > 0);
      const hasContent = hasArtwork || hasCaptions;

      results.push({
        milestoneId: milestone.id,
        artwork,
        captions,
        status: hasArtwork ? "ready" : hasCaptions ? "needs-review" : "draft",
        generationStatus: hasArtwork
          ? "generated"
          : hasContent
            ? "needs_review"
            : "ready_to_generate",
      });
    }

    await syncHeroFromAllMilestoneArtwork({
      eventId: input.eventId,
      milestones: input.milestones,
      results,
    });

    const scopeLabel =
      input.milestoneIds?.length === 1
        ? "this milestone"
        : input.milestoneIds?.length
          ? "selected milestones"
          : "all milestones";

    return {
      success: true,
      results,
      message: `Artwork and captions generated for ${scopeLabel}.`,
      updatedInspiration: resolved.inspiration,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Content generation failed.";
    return {
      success: false,
      results: [],
      message,
    };
  }
}

export async function uploadInspirationImageAction(
  eventId: string,
  formData: FormData,
): Promise<{
  success: boolean;
  image?: InspirationImagePayload;
  message: string;
}> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Choose an image to upload." };
  }

  const label = String(formData.get("label") ?? file.name ?? "inspiration.png");
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const contentType = file.type || "image/png";
  const dataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  const persisted = await persistInspirationImages(eventId, [
    {
      id: String(formData.get("id") ?? `inspiration-${Date.now()}`),
      label,
      url: null,
      dataUrl,
    },
  ]);

  if (persisted.error || persisted.updatedImages.length === 0) {
    return {
      success: false,
      message: persisted.error ?? "Could not upload inspiration image.",
    };
  }

  const uploaded = persisted.updatedImages[0]!;
  return {
    success: true,
    image: uploaded,
    message: "Inspiration image uploaded.",
  };
}

export async function suggestMilestonesAction(input: {
  eventDate: string;
  playbookId: string;
  globalAiGuidance: string;
  brandKitId: string | null;
  useBrandKit: boolean;
}): Promise<{
  success: boolean;
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
  message: string;
}> {
  const result = suggestMilestonesFromContext({
    eventDate: input.eventDate,
    playbookId: input.playbookId,
    globalAiGuidance: input.globalAiGuidance,
    brandKitId: input.brandKitId,
    useBrandKit: input.useBrandKit,
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    ...result,
    message: "Milestones suggested from playbook and campaign date (demo stub).",
  };
}

export async function sendForApprovalAction(input: {
  eventId: string;
  campaignName: string;
  recipientEmail?: string | null;
  milestones?: CampaignBuilderMilestone[];
  previewContents?: MilestonePreviewContent[];
}): Promise<{
  success: boolean;
  message: string;
}> {
  if (input.milestones?.length && input.previewContents?.length) {
    const result = await sendCampaignBuilderForApproval({
      eventId: input.eventId,
      campaignName: input.campaignName,
      milestones: input.milestones,
      previewContents: input.previewContents,
    });

    if (result.success) {
      revalidatePath("/approvals");
    }

    return {
      success: result.success,
      message: result.message,
    };
  }

  const { sendCampaignBuilderForApprovalFromSession } = await import(
    "@/lib/campaign-builder-v2/approval-bridge"
  );
  const result = await sendCampaignBuilderForApprovalFromSession(
    input.eventId,
    input.campaignName,
  );

  if (result.success) {
    revalidatePath("/approvals");
  }

  return {
    success: result.success,
    message: result.message,
  };
}

export async function approveAllAndScheduleAction(eventId: string): Promise<{
  success: boolean;
  message: string;
}> {
  void eventId;

  return {
    success: true,
    message: "All milestones approved and scheduled (demo stub).",
  };
}

export async function saveDraftAction(eventId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { loadCampaignBuilderSessionAction, saveCampaignBuilderSessionAction } =
    await import("@/lib/campaign-builder-v2/session");
  const session = await loadCampaignBuilderSessionAction(eventId);

  if (!session) {
    return {
      success: false,
      message: "Campaign session not found.",
    };
  }

  const result = await saveCampaignBuilderSessionAction(session);

  return {
    success: result.success,
    message: result.success
      ? "Campaign saved as draft."
      : result.message,
  };
}

export async function syncAppliedMilestoneArtworkAction(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  milestoneId: string;
  artwork: MilestoneArtwork;
}): Promise<void> {
  await syncHeroFromMilestoneArtwork(input);
}
