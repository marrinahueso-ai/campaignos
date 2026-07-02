import "server-only";

import {
  resolveOpenAiImageSize,
} from "@/lib/ai-artwork/constants";
import {
  createConceptBatchId,
  insertArtworkConcept,
  setAssetPlanStatusGenerated,
} from "@/lib/ai-artwork/mutations";
import {
  auditArtworkV2OrchestrationPayload,
  logArtworkGenerationPayloadAudit,
} from "@/lib/ai-artwork/prompt-audit";
import { getArtworkProvider } from "@/lib/ai-artwork/provider";
import {
  buildConceptStoragePath,
  uploadArtworkBytes,
} from "@/lib/ai-artwork/storage";
import {
  resolveArtworkGenerationProfile,
  type ArtworkGenerationProfile,
} from "@/lib/artwork-v2/generation-mode";
import {
  generateArtworkV2ImageNative,
  type ArtworkV2OrchestrationRequest,
} from "@/lib/artwork-v2/orchestrator";
import type { ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";
import type { ImageSizePreset } from "@/lib/ai-artwork/types";
import type { EventAssetType } from "@/types/event-workspace";

export async function runArtworkV2Generation(input: {
  eventId: string;
  assetId: string;
  assetType: EventAssetType;
  imageSizePreset: ImageSizePreset;
  userManualPrompt: string;
  orchestration: ArtworkV2OrchestrationRequest;
  inspirationAssetId: string | null;
  generationProfile?: ArtworkGenerationProfile;
}): Promise<{
  success: boolean;
  error: string | null;
  warning?: string | null;
  orchestratedPrompt?: string;
  versions: ArtworkV2ReviewVersion[];
}> {
  const size = resolveOpenAiImageSize(input.imageSizePreset);

  logArtworkGenerationPayloadAudit(
    auditArtworkV2OrchestrationPayload({
      userManualPrompt: input.userManualPrompt,
      orchestration: input.orchestration,
      size,
    }),
  );

  const profile = input.generationProfile ?? resolveArtworkGenerationProfile("refined");
  const batchId = createConceptBatchId();
  const provider = getArtworkProvider("openai");
  const versions: ArtworkV2ReviewVersion[] = [];
  let uploadFailureCount = 0;
  let insertFailureCount = 0;
  let lastUploadError: string | null = null;
  let lastRevisedPrompt: string | null = null;

  for (let index = 1; index <= profile.versionCount; index += 1) {
    const result = await generateArtworkV2ImageNative(
      input.orchestration,
      size,
      input.eventId,
      {
        quality: profile.quality,
        reasoningEffort: profile.reasoning,
      },
    );

    if (!result.success || !result.imageBase64) {
      if (versions.length === 0) {
        return {
          success: false,
          error: result.error ?? "Unable to generate artwork.",
          orchestratedPrompt: lastRevisedPrompt ?? input.userManualPrompt,
          versions: [],
        };
      }
      break;
    }

    if (result.revisedPrompt) {
      lastRevisedPrompt = result.revisedPrompt;
    }

    const storagePath = buildConceptStoragePath({
      eventId: input.eventId,
      assetType: input.assetType,
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

    const storedPrompt = result.revisedPrompt ?? input.userManualPrompt;

    const conceptId = await insertArtworkConcept({
      event_id: input.eventId,
      event_asset_id: input.assetId,
      batch_id: batchId,
      concept_index: index,
      storage_path: storagePath,
      filename: `concept-${index}.png`,
      generation_prompt: storedPrompt,
      additional_instructions: null,
      negative_instructions: null,
      image_size_preset: input.imageSizePreset,
      style: null,
      variation_type: null,
      inspiration_asset_id: input.inspirationAssetId,
      provider: provider.id,
      model: result.model,
    });

    if (conceptId) {
      versions.push({
        id: conceptId,
        index,
        imageUrl: uploaded.publicUrl,
      });
    } else {
      insertFailureCount += 1;
    }
  }

  if (versions.length === 0) {
    const storageOnlyFailure = uploadFailureCount > 0 && insertFailureCount === 0;
    return {
      success: false,
      error: storageOnlyFailure
        ? "We couldn't save generated artwork to storage. Try again."
        : "No artwork versions were generated.",
      orchestratedPrompt: lastRevisedPrompt ?? input.userManualPrompt,
      versions: [],
    };
  }

  await setAssetPlanStatusGenerated(input.eventId, input.assetId);

  const failedCount = uploadFailureCount + insertFailureCount;
  const warning =
    failedCount > 0
      ? `Only ${versions.length} of ${profile.versionCount} versions were saved.${
          lastUploadError ? ` ${lastUploadError}` : ""
        }`
      : null;

  return {
    success: true,
    error: null,
    warning,
    orchestratedPrompt: lastRevisedPrompt ?? input.userManualPrompt,
    versions,
  };
}
