"use server";

import { revalidatePath } from "next/cache";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { logAiUsage } from "@/lib/ai/usage";
import {
  CONCEPT_COUNT,
  DEFAULT_GENERATION_SETTINGS,
  VARIATION_PRESETS,
  resolveOpenAiImageSize,
} from "@/lib/ai-artwork/constants";
import {
  createConceptBatchId,
  discardConcept,
  insertArtworkConcept,
  saveGenerationSettings,
  setAssetPlanStatusGenerated,
  setAssetPlanStatusInProgress,
} from "@/lib/ai-artwork/mutations";
import { detectReadyToPostPromptConflicts } from "@/lib/ai-artwork/artwork-mode";
import {
  buildArtworkGenerationPrompt,
} from "@/lib/ai-artwork/prompts";
import {
  auditArtworkGenerationPayload,
  logArtworkGenerationPayloadAudit,
} from "@/lib/ai-artwork/prompt-audit";
import { buildVerifiedEventFacts } from "@/lib/ai-artwork/event-facts";
import { buildArtworkTextPlan } from "@/lib/ai-artwork/text-plan";
import {
  resolveInspirationContext,
  resolveInspirationImageReference,
} from "@/lib/ai-artwork/inspiration";
import { applyAutoInspirationToSettings } from "@/lib/ai-artwork/resolve-inspiration-settings";
import {
  ARTWORK_GENERATION_DISABLED_MESSAGE,
  isArtworkSectionDisabled,
} from "@/lib/creative-studio/artwork-section-disabled";
import {
  isHumanDirectedArtworkGeneration,
  MANUAL_PROMPT_REQUIRED_MESSAGE,
  resolveFinalArtworkImagePrompt,
  sanitizeHumanDirectedSettings,
} from "@/lib/ai-artwork/generation-mode";
import {
  generateArtworkImage,
  getArtworkProvider,
  getArtworkProviderCapabilities,
  isArtworkGenerationConfigured,
} from "@/lib/ai-artwork/provider";
import { getConceptsForAsset } from "@/lib/ai-artwork/queries";
import { parseGenerationSettings } from "@/lib/ai-artwork/settings";
import {
  buildConceptStoragePath,
  uploadArtworkBytes,
} from "@/lib/ai-artwork/storage";
import { activateConceptAsAsset } from "@/lib/ai-artwork/versions";
import type {
  ArtworkActionState,
  ArtworkGenerationSettings,
  VariationPresetId,
} from "@/lib/ai-artwork/types";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { buildCreativeDirectorContext } from "@/lib/creative-director/build-context";
import { buildCreativeBriefFromContext } from "@/lib/creative-director/build-brief";
import { CORE_ASSET_PLAN_SPECS } from "@/lib/creative-director/constants";
import { saveStyleMemoryEntry } from "@/lib/creative-director/mutations";
import { getCreativeBriefForEvent } from "@/lib/creative-director/queries";
import { buildStyleSnapshotFromApproval } from "@/lib/creative-director/style-memory";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import { resolveCtaStrategy } from "@/lib/ai-strategy/cta";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import type { Event } from "@/types";

function revalidateArtworkPaths(eventId: string): void {
  revalidatePath("/creative-studio");
  revalidateEventPaths(eventId);
}

async function uploadedByLabel(): Promise<string> {
  const role = await getCurrentCampaignRole();
  return campaignRoleLabel(role);
}

async function resolveArtworkCtaForEvent(event: Event): Promise<string | null> {
  const organization = await getLatestOrganization();
  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;
  const stage = resolveCampaignStage({ eventDate: event.date });
  const cta = resolveCtaStrategy({
    stageId: stage.id,
    channel: "flyer",
    defaultCtaStyle: profile?.defaultCtaStyle ?? null,
    volunteerNeeds: event.volunteerNeeds,
  });
  return cta.primary.text;
}

async function resolveAssetContext(eventId: string, assetId: string) {
  const event = await getEventById(eventId);
  if (!event) return null;

  const assets = await getCampaignAssetsForEvent(eventId);
  const asset = assets.find((entry) => entry.id === assetId);
  if (!asset) return null;

  const context = await buildCreativeDirectorContext(event);
  const storedBrief = await getCreativeBriefForEvent(eventId);
  const brief = storedBrief.brief ?? buildCreativeBriefFromContext(context);

  const planLabel =
    asset.planLabel ??
    CORE_ASSET_PLAN_SPECS.find((spec) => spec.assetType === asset.assetType)?.label ??
    getCreativeAssetTypeLabel(asset.assetType);

  const settings = asset.generationSettings ?? { ...DEFAULT_GENERATION_SETTINGS };
  const organization = await getLatestOrganization();
  const cta = await resolveArtworkCtaForEvent(event);
  const eventFacts = buildVerifiedEventFacts({
    event,
    organizationName: organization?.name ?? null,
    cta,
  });
  const textPlan = buildArtworkTextPlan({
    facts: eventFacts,
    brief,
    assetLabel: planLabel,
  });

  const baseSettings: ArtworkGenerationSettings = {
    ...settings,
    textPlan,
  };

  const settingsWithTextPlan: ArtworkGenerationSettings = isHumanDirectedArtworkGeneration()
    ? sanitizeHumanDirectedSettings(baseSettings)
    : applyAutoInspirationToSettings({
        settings: baseSettings,
        asset,
        brief,
        context,
      });

  const providerCapabilities = getArtworkProviderCapabilities("openai");
  const manualInspirationOnly = isHumanDirectedArtworkGeneration();
  const inspirationStrength = manualInspirationOnly
    ? settingsWithTextPlan.inspirationAssetId
      ? "light"
      : settingsWithTextPlan.inspirationStrength
    : settingsWithTextPlan.inspirationAssetId && !settingsWithTextPlan.inspirationStrength
      ? "strong"
      : settingsWithTextPlan.inspirationStrength;

  const inspiration = settingsWithTextPlan.inspirationAssetId
    ? manualInspirationOnly
      ? await resolveInspirationImageReference({
          inspirationAssetId: settingsWithTextPlan.inspirationAssetId,
          context,
          usageMode: providerCapabilities.inspirationUsageMode,
        })
      : await resolveInspirationContext({
          inspirationAssetId: settingsWithTextPlan.inspirationAssetId,
          existingProfile: settingsWithTextPlan.inspirationStyleProfile,
          context,
          usageMode: providerCapabilities.inspirationUsageMode,
          strength: inspirationStrength,
          refreshProfile: true,
        })
    : null;

  const supportInspirations = manualInspirationOnly
    ? []
    : settingsWithTextPlan.supportInspirationAssetIds
        .map((inspirationId) => {
          const match = context.inspirationAssets.find((item) => item.assetId === inspirationId);
          if (match) {
            return { eventTitle: match.eventTitle, summary: `Approved ${match.assetType} artwork.` };
          }
          return null;
        })
        .filter((entry): entry is { eventTitle: string; summary: string } => Boolean(entry));

  if (settingsWithTextPlan.inspirationAssetId && inspiration && !manualInspirationOnly) {
    settingsWithTextPlan.inspirationStyleProfile = inspiration.profile;
  } else {
    settingsWithTextPlan.inspirationStyleProfile = null;
  }

  const customPrompt = resolveFinalArtworkImagePrompt(settingsWithTextPlan.customPromptOverride);

  return {
    event,
    asset,
    brief,
    planLabel,
    settings: settingsWithTextPlan,
    customPrompt: customPrompt || null,
    inspiration,
    supportInspirations,
    context,
    eventFacts,
    textPlan,
    brandColors: context.brandColors,
    styleMemory: manualInspirationOnly ? [] : context.styleMemory,
  };
}

export async function saveArtworkPromptAction(
  eventId: string,
  assetId: string,
  customPrompt: string,
  settings: ArtworkGenerationSettings,
): Promise<ArtworkActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to edit artwork prompts." };
  }

  const ctx = await resolveAssetContext(eventId, assetId);
  if (!ctx) return { success: false, error: "Asset not found." };

  const storedInspirationId = ctx.asset.generationSettings?.inspirationAssetId ?? null;
  const providerCapabilities = getArtworkProviderCapabilities("openai");
  const inspiration = isHumanDirectedArtworkGeneration()
    ? null
    : await resolveInspirationContext({
        inspirationAssetId: settings.inspirationAssetId,
        existingProfile: settings.inspirationStyleProfile ?? ctx.settings.inspirationStyleProfile,
        context: ctx.context,
        usageMode: providerCapabilities.inspirationUsageMode,
        strength: settings.inspirationAssetId
          ? settings.inspirationStrength || "strong"
          : settings.inspirationStrength,
        refreshProfile:
          settings.inspirationAssetId !== storedInspirationId || !settings.inspirationStyleProfile,
      });

  const settingsToSave: ArtworkGenerationSettings = isHumanDirectedArtworkGeneration()
    ? sanitizeHumanDirectedSettings({
        ...settings,
        textPlan: ctx.textPlan,
        customPromptOverride: customPrompt.trim() || null,
        supportInspirationAssetIds: [],
        inspirationStrength: settings.inspirationAssetId ? "light" : settings.inspirationStrength,
      })
    : {
        ...settings,
        textPlan: ctx.textPlan,
        customPromptOverride: customPrompt.trim() || null,
        inspirationStyleProfile: inspiration?.profile ?? null,
      };

  const saved = await saveGenerationSettings(
    eventId,
    assetId,
    settingsToSave,
    resolveFinalArtworkImagePrompt(settingsToSave.customPromptOverride) || undefined,
  );
  if (!saved) return { success: false, error: "Unable to save prompt settings." };

  revalidateArtworkPaths(eventId);
  return { success: true, error: null };
}

export async function generateArtworkConceptsAction(
  eventId: string,
  assetId: string,
): Promise<ArtworkActionState> {
  if (isArtworkSectionDisabled()) {
    return { success: false, error: ARTWORK_GENERATION_DISABLED_MESSAGE };
  }

  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate artwork." };
  }

  if (!isArtworkGenerationConfigured()) {
    return { success: false, error: "AI artwork generation is not configured." };
  }

  const ctx = await resolveAssetContext(eventId, assetId);
  if (!ctx) return { success: false, error: "Asset not found." };

  const finalPrompt = resolveFinalArtworkImagePrompt(ctx.settings.customPromptOverride);
  if (isHumanDirectedArtworkGeneration() && !finalPrompt) {
    return { success: false, error: MANUAL_PROMPT_REQUIRED_MESSAGE };
  }

  const settingsForGeneration = isHumanDirectedArtworkGeneration()
    ? sanitizeHumanDirectedSettings(ctx.settings)
    : applyAutoInspirationToSettings({
        settings: ctx.settings,
        asset: ctx.asset,
        brief: ctx.brief,
        context: ctx.context,
      });

  const providerCapabilities = getArtworkProviderCapabilities("openai");
  const inspiration = settingsForGeneration.inspirationAssetId
    ? isHumanDirectedArtworkGeneration()
      ? await resolveInspirationImageReference({
          inspirationAssetId: settingsForGeneration.inspirationAssetId,
          context: ctx.context,
          usageMode: providerCapabilities.inspirationUsageMode,
        })
      : await resolveInspirationContext({
          inspirationAssetId: settingsForGeneration.inspirationAssetId,
          existingProfile: settingsForGeneration.inspirationStyleProfile,
          context: ctx.context,
          usageMode: providerCapabilities.inspirationUsageMode,
          strength: settingsForGeneration.inspirationAssetId
            ? settingsForGeneration.inspirationStrength || "strong"
            : settingsForGeneration.inspirationStrength,
          refreshProfile: true,
        })
    : null;

  settingsForGeneration.inspirationStyleProfile = isHumanDirectedArtworkGeneration()
    ? null
    : inspiration?.profile ?? null;

  const supportInspirations: { eventTitle: string; summary: string }[] = [];

  await setAssetPlanStatusInProgress(eventId, assetId);
  await saveGenerationSettings(
    eventId,
    assetId,
    settingsForGeneration,
    finalPrompt || undefined,
  );

  const batchId = createConceptBatchId();
  const size = resolveOpenAiImageSize(ctx.settings.imageSizePreset);
  const provider = getArtworkProvider("openai");
  const conceptIds: string[] = [];
  let uploadFailureCount = 0;
  let insertFailureCount = 0;
  let lastUploadError: string | null = null;

  for (let index = 1; index <= CONCEPT_COUNT; index += 1) {
    const prompt = isHumanDirectedArtworkGeneration()
      ? finalPrompt
      : buildArtworkGenerationPrompt({
          brief: ctx.brief,
          customPrompt: finalPrompt,
          settings: settingsForGeneration,
          assetLabel: ctx.planLabel,
          eventFacts: ctx.eventFacts,
          eventType: ctx.event.eventType,
          brandColors: ctx.brandColors,
          styleMemory: ctx.styleMemory,
          textPlan: ctx.textPlan,
          inspiration,
          supportInspirations,
          conceptIndex: index,
        });

    const referenceImageUrl =
      providerCapabilities.supportsImageReference && inspiration?.referenceImageUrl
        ? inspiration.referenceImageUrl
        : null;

    if (isHumanDirectedArtworkGeneration()) {
      logArtworkGenerationPayloadAudit(
        auditArtworkGenerationPayload({
          userManualPrompt: finalPrompt,
          finalPrompt: prompt,
          referenceImageUrl,
          size,
        }),
      );
    }

    const result = await generateArtworkImage(
      {
        prompt,
        size,
        conceptIndex: index,
        referenceImageUrl,
        inspirationStrength: isHumanDirectedArtworkGeneration()
          ? "light"
          : settingsForGeneration.inspirationStrength,
      },
      "openai",
    );

    await logAiUsage({
      eventId,
      actionType: "generate_artwork",
      channel: null,
      model: result.model,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      success: result.success,
      errorMessage: result.error,
    });

    if (!result.success || !result.imageBase64) {
      if (conceptIds.length === 0) {
        return {
          success: false,
          error: result.error ?? "Unable to generate artwork concepts.",
        };
      }
      break;
    }

    const storagePath = buildConceptStoragePath({
      eventId,
      assetType: ctx.asset.assetType,
      batchId,
      conceptIndex: index,
    });
    const bytes = Buffer.from(result.imageBase64, "base64");
    const uploaded = await uploadArtworkBytes({ storagePath, bytes });

    if (!uploaded.success || !uploaded.publicUrl) {
      uploadFailureCount += 1;
      lastUploadError = uploaded.error ?? "Storage upload failed.";
      continue;
    }

    const conceptId = await insertArtworkConcept({
      event_id: eventId,
      event_asset_id: assetId,
      batch_id: batchId,
      concept_index: index,
      storage_path: uploaded.publicUrl,
      filename: `concept-${index}.png`,
      generation_prompt: prompt,
      additional_instructions: ctx.settings.additionalInstructions || null,
      negative_instructions: ctx.settings.negativeInstructions || null,
      image_size_preset: ctx.settings.imageSizePreset,
      style: ctx.settings.style || null,
      variation_type: null,
      inspiration_asset_id: settingsForGeneration.inspirationAssetId,
      provider: provider.id,
      model: result.model,
    });

    if (conceptId) {
      conceptIds.push(conceptId);
    } else {
      insertFailureCount += 1;
    }
  }

  if (conceptIds.length === 0) {
    const storageOnlyFailure = uploadFailureCount > 0 && insertFailureCount === 0;
    return {
      success: false,
      error: storageOnlyFailure
        ? "We couldn't save generated artwork to storage. Your prompt is saved — try again."
        : "No concepts were generated.",
    };
  }

  await setAssetPlanStatusGenerated(eventId, assetId);
  revalidateArtworkPaths(eventId);

  const failedCount = uploadFailureCount + insertFailureCount;
  const warning =
    failedCount > 0
      ? `Only ${conceptIds.length} of ${CONCEPT_COUNT} concepts were saved.${
          lastUploadError ? ` ${lastUploadError}` : ""
        }`
      : null;

  return { success: true, error: null, warning, batchId, conceptIds };
}

export async function generateArtworkVariationAction(
  eventId: string,
  assetId: string,
  variationId: VariationPresetId,
): Promise<ArtworkActionState> {
  if (isArtworkSectionDisabled()) {
    return { success: false, error: ARTWORK_GENERATION_DISABLED_MESSAGE };
  }

  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to generate variations." };
  }

  const variation = VARIATION_PRESETS.find((entry) => entry.id === variationId);
  if (!variation) {
    return { success: false, error: "Unknown variation preset." };
  }

  const ctx = await resolveAssetContext(eventId, assetId);
  if (!ctx) return { success: false, error: "Asset not found." };

  const settings = {
    ...ctx.settings,
    additionalInstructions: [ctx.settings.additionalInstructions, variation.promptSuffix]
      .filter(Boolean)
      .join("\n"),
  };

  await saveGenerationSettings(eventId, assetId, settings, ctx.customPrompt ?? undefined);
  return generateArtworkConceptsAction(eventId, assetId);
}

export async function approveArtworkConceptAction(
  eventId: string,
  assetId: string,
  conceptId: string,
): Promise<ArtworkActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to approve artwork." };
  }

  const concepts = await getConceptsForAsset(assetId);
  const concept = concepts.find((entry) => entry.id === conceptId);
  if (!concept) return { success: false, error: "Concept not found." };

  const activated = await activateConceptAsAsset({
    eventId,
    assetId,
    concept,
    uploadedBy: await uploadedByLabel(),
  });

  if (!activated.success) {
    return { success: false, error: activated.error };
  }

  const ctx = await resolveAssetContext(eventId, assetId);
  const organization = await getLatestOrganization();
  if (ctx && organization) {
    await saveStyleMemoryEntry({
      organizationId: organization.id,
      sourceEventId: eventId,
      sourceAssetId: assetId,
      eventTitle: ctx.event.title,
      assetType: ctx.asset.assetType,
      style: buildStyleSnapshotFromApproval({
        asset: { ...ctx.asset, status: "uploaded", storagePath: concept.storagePath },
        brief: ctx.brief,
      }),
    });
  }

  revalidateArtworkPaths(eventId);
  return { success: true, error: null };
}

export async function discardArtworkConceptAction(
  eventId: string,
  conceptId: string,
): Promise<ArtworkActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to delete concepts." };
  }

  const discarded = await discardConcept(conceptId);
  if (!discarded) {
    return { success: false, error: "Unable to discard concept." };
  }

  revalidateArtworkPaths(eventId);
  return { success: true, error: null };
}

export async function regenerateArtworkConceptAction(
  eventId: string,
  assetId: string,
  conceptId: string,
): Promise<ArtworkActionState> {
  await discardArtworkConceptAction(eventId, conceptId);
  return generateArtworkConceptsAction(eventId, assetId);
}

export async function getArtworkWorkspaceDataAction(eventId: string, assetId: string) {
  const ctx = await resolveAssetContext(eventId, assetId);
  if (!ctx) return null;

  const concepts = await getConceptsForAsset(assetId);
  const pendingConcepts = concepts.filter((c) => c.status === "pending");

  return {
    planLabel: ctx.planLabel,
    brief: ctx.brief,
    customPrompt: ctx.customPrompt,
    settings: ctx.settings,
    asset: ctx.asset,
    pendingConcepts,
    allConcepts: concepts,
  };
}

export { parseGenerationSettings };

export async function previewArtworkPromptAction(eventId: string, assetId: string) {
  const ctx = await resolveAssetContext(eventId, assetId);
  if (!ctx) return null;

  const providerCapabilities = getArtworkProviderCapabilities("openai");
  const inspiration = isHumanDirectedArtworkGeneration()
    ? ctx.settings.inspirationAssetId
      ? await resolveInspirationImageReference({
          inspirationAssetId: ctx.settings.inspirationAssetId,
          context: ctx.context,
          usageMode: providerCapabilities.inspirationUsageMode,
        })
      : null
    : await resolveInspirationContext({
        inspirationAssetId: ctx.settings.inspirationAssetId,
        existingProfile: ctx.settings.inspirationStyleProfile,
        context: ctx.context,
        usageMode: providerCapabilities.inspirationUsageMode,
        strength: ctx.settings.inspirationAssetId
          ? ctx.settings.inspirationStrength || "strong"
          : ctx.settings.inspirationStrength,
        refreshProfile: true,
      });

  const settingsForPreview = isHumanDirectedArtworkGeneration()
    ? sanitizeHumanDirectedSettings(ctx.settings)
    : {
        ...ctx.settings,
        inspirationStyleProfile: inspiration?.profile ?? null,
      };

  const finalPrompt = resolveFinalArtworkImagePrompt(ctx.settings.customPromptOverride);
  const referenceImageUrl = inspiration?.referenceImageUrl ?? null;
  const imageSize = resolveOpenAiImageSize(ctx.settings.imageSizePreset);

  const payloadAudit = isHumanDirectedArtworkGeneration()
    ? auditArtworkGenerationPayload({
        userManualPrompt: finalPrompt,
        finalPrompt,
        referenceImageUrl,
        size: imageSize,
      })
    : null;

  if (payloadAudit) {
    logArtworkGenerationPayloadAudit(payloadAudit);
  }

  const legacyFinalPrompt = isHumanDirectedArtworkGeneration()
    ? finalPrompt
    : buildArtworkGenerationPrompt({
        brief: ctx.brief,
        customPrompt: finalPrompt,
        settings: settingsForPreview,
        assetLabel: ctx.planLabel,
        eventFacts: ctx.eventFacts,
        eventType: ctx.event.eventType,
        brandColors: ctx.brandColors,
        styleMemory: ctx.styleMemory,
        textPlan: ctx.textPlan,
        inspiration,
        supportInspirations: ctx.supportInspirations,
        conceptIndex: 1,
      });

  const promptWarnings =
    isHumanDirectedArtworkGeneration() || settingsForPreview.artworkMode !== "ready_to_post"
      ? []
      : detectReadyToPostPromptConflicts(legacyFinalPrompt);

  return {
    supportsImageReference: providerCapabilities.supportsImageReference,
    inspirationUsageMode: providerCapabilities.inspirationUsageMode,
    configuredModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
    artworkMode: settingsForPreview.artworkMode,
    promptWarnings,
    inspirationAsset: inspiration
      ? {
          assetId: inspiration.asset.assetId,
          eventTitle: inspiration.asset.eventTitle,
          filename: inspiration.asset.filename,
          imageUrl: inspiration.referenceImageUrl,
        }
      : null,
    styleProfile: isHumanDirectedArtworkGeneration() ? null : inspiration?.profile ?? null,
    inspirationStrength: settingsForPreview.inspirationStrength,
    finalPrompt: legacyFinalPrompt,
    payloadAudit,
    imageSize,
  };
}
