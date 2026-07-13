"use server";

/**
 * Campaign Builder V2 server actions.
 * Artwork uses artwork-v2 orchestrator; captions use the shared AI text provider.
 */

import { revalidatePath } from "next/cache";
import { suggestMilestonesFromContext } from "@/lib/campaign-builder-v2/suggest-milestones";
import { getPlaybookSteps } from "@/lib/playbooks/queries";
import type { PlaybookMilestoneStep } from "@/lib/campaign-builder-v2/playbook-milestones";
import { sendCampaignBuilderForApproval } from "@/lib/campaign-builder-v2/approval-bridge";
import {
  resolveSingleGenerationTarget,
  validateBeforeGeneration,
} from "@/lib/campaign-builder-v2/validation";
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
import { logGenerateAllContentDebug } from "@/lib/campaign-builder-v2/debug";
import { syncCaptionsToPlatforms } from "@/lib/campaign-builder-v2/caption-utils";
import {
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

function firstCampaignStyleReferenceUrl(input: {
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
  excludeMilestoneId: string;
}): string | null {
  const sorted = [...input.milestones].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  for (const milestone of sorted) {
    if (milestone.id === input.excludeMilestoneId) {
      continue;
    }
    const preview = input.previewContents.find(
      (content) => content.milestoneId === milestone.id,
    );
    const feedUrl = preview?.artwork.feedUrl?.trim() || null;
    const storyUrl = preview?.artwork.storyUrl?.trim() || null;
    const candidate = feedUrl || storyUrl;
    if (candidate && !isPlaceholderArtworkUrl(candidate)) {
      return candidate;
    }
  }

  return null;
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
  const incoming = inspirationImages ?? inspiration.inspirationImages ?? [];
  // If the client accidentally sent an empty list but the session still has
  // http inspiration, prefer the session copy so later milestones do not
  // silently generate without a visual base.
  const images =
    incoming.length > 0
      ? incoming
      : (inspiration.inspirationImages ?? []).filter(
          (image) =>
            Boolean(
              image.url?.startsWith("http://") ||
                image.url?.startsWith("https://") ||
                image.previewUrl?.startsWith("http://") ||
                image.previewUrl?.startsWith("https://"),
            ),
        );

  const persisted = await persistInspirationImages(eventId, images);

  if (persisted.error) {
    return {
      inspiration,
      inspirationImageUrls: [],
      error: persisted.error,
    };
  }

  const updatedImages =
    persisted.updatedImages.some((image) => Boolean(image.url?.trim()))
      ? persisted.updatedImages
      : inspiration.inspirationImages;

  return {
    inspiration: {
      ...inspiration,
      inspirationImages: updatedImages,
    },
    inspirationImageUrls:
      persisted.urls.length > 0
        ? persisted.urls
        : updatedImages
            .map((image) => image.url?.trim() || image.previewUrl?.trim() || "")
            .filter((url) => url.startsWith("http://") || url.startsWith("https://")),
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

  const target = resolveSingleGenerationTarget({
    milestones: input.milestones,
    milestoneIds: input.milestoneIds,
  });

  if (!target.milestone) {
    return {
      success: false,
      results: [],
      message: target.error ?? "Select exactly one milestone to generate content.",
    };
  }

  // Single-element by construction — generation must never fan out to other
  // milestones. Kept as an array only because the shared helpers below
  // (hero sync, debug logging) are written against a results list.
  const targetMilestones = [target.milestone];

  try {
    const resolved = await resolveInspirationForGeneration(
      input.eventId,
      input.inspiration,
      input.inspirationImages,
    );

    if (resolved.error) {
      const { reportFailedAction } = await import("@/lib/monitoring/report-error");
      reportFailedAction("ai", {
        action: "generateAllContentAction.resolveInspiration",
        eventId: input.eventId,
        message: resolved.error,
      });
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

      logGenerateAllContentDebug({
        eventId: input.eventId,
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        generationStatusBefore: preview?.generationStatus ?? null,
        phase: "start",
      });

      const styleReferenceUrl = firstCampaignStyleReferenceUrl({
        milestones: input.milestones,
        previewContents: input.previewContents,
        excludeMilestoneId: milestone.id,
      });
      const inspirationImageUrls = styleReferenceUrl
        ? Array.from(
            new Set([styleReferenceUrl, ...resolved.inspirationImageUrls]),
          ).slice(0, 4)
        : resolved.inspirationImageUrls;

      const artworkGeneration = await generateArtworkForMilestone({
        eventId: input.eventId,
        milestone,
        enabledFormats,
        inspiration: resolved.inspiration,
        inspirationImageUrls,
        brandKitId: input.brandKitId,
        useBrandKit: input.useBrandKit,
        existingArtwork: preview?.artwork,
        forceRegenerate: false,
      });

      if (!artworkGeneration.success) {
        logGenerateAllContentDebug({
          eventId: input.eventId,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          generationStatusBefore: preview?.generationStatus ?? null,
          generationStatusAfter: "failed",
          phase: "failed",
          message:
            artworkGeneration.message ||
            `Could not generate artwork for "${milestone.name}".`,
        });

        const { reportFailedAction } = await import("@/lib/monitoring/report-error");
        reportFailedAction("ai", {
          action: "generateAllContentAction.artwork",
          eventId: input.eventId,
          milestoneId: milestone.id,
          message:
            artworkGeneration.message ||
            `Could not generate artwork for "${milestone.name}".`,
        });

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
          logGenerateAllContentDebug({
            eventId: input.eventId,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            generationStatusBefore: preview?.generationStatus ?? null,
            generationStatusAfter: "failed",
            phase: "failed",
            message:
              captionResult.message ||
              `Could not generate caption for "${milestone.name}".`,
          });

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

      const generationStatus = hasArtwork
        ? "generated"
        : hasContent
          ? "needs_review"
          : "ready_to_generate";

      results.push({
        milestoneId: milestone.id,
        artwork,
        captions,
        status: hasArtwork ? "ready" : hasCaptions ? "needs-review" : "draft",
        generationStatus,
      });

      logGenerateAllContentDebug({
        eventId: input.eventId,
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        generationStatusBefore: preview?.generationStatus ?? null,
        generationStatusAfter: generationStatus,
        phase: "complete",
      });
    }

    // Intentionally do NOT sync hero / revalidateEventPaths here.
    // revalidatePath during generation remounts the campaign builder, strips
    // the URL hash (resetting to Inspiration), and can overwrite freshly
    // generated artwork with a stale server session. Hero sync runs later
    // when the user leaves Preview or publishes.

    return {
      success: true,
      results,
      message: `Artwork and captions generated for ${target.milestone.name}.`,
      updatedInspiration: resolved.inspiration,
    };
  } catch (error) {
    const { reportIntegrationError } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("ai", error, { action: "generateAllContentAction" });
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

/**
 * Loads the ordered steps for a real playbook (from
 * communication_playbook_steps) for use by the Save & Continue →
 * Milestones flow. Returns an empty list (not an error) for demo/legacy
 * playbook ids that don't exist in the DB, so callers can fall back to
 * keeping the existing milestone set rather than wiping it out.
 */
export async function getPlaybookMilestoneStepsAction(
  playbookId: string,
): Promise<{ success: boolean; steps: PlaybookMilestoneStep[] }> {
  if (!playbookId) {
    return { success: true, steps: [] };
  }

  try {
    const steps = await getPlaybookSteps(playbookId);
    return {
      success: true,
      steps: steps.map((step) => ({
        title: step.title,
        channel: step.channel,
        relativeDay: step.relativeDay,
        sortOrder: step.sortOrder,
      })),
    };
  } catch (error) {
    console.error("Failed to load playbook steps:", error);
    return { success: false, steps: [] };
  }
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
