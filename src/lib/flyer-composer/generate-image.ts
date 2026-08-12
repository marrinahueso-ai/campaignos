import "server-only";

import { randomUUID } from "node:crypto";

import { isAiConfigured } from "@/lib/ai/provider";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { generateArtworkV2ImageNative } from "@/lib/artwork-v2/orchestrator";
import { getAuthUser } from "@/lib/auth/queries";
import {
  buildFlyerComposerImagePrompt,
  resolveFlyerComposerImageSize,
} from "@/lib/flyer-composer/generate-image-prompt";
import { resolveFlyerComposerOpenAiReferenceImageUrls } from "@/lib/flyer-composer/reference-images";
import { resolveFlyerComposerQrUrl } from "@/lib/flyer-composer/qr-code";
import { compositeFlyerQrCode } from "@/lib/flyer-composer/qr-composite";
import type {
  FlyerComposerGenerateInput,
  FlyerComposerGenerateImageResult,
} from "@/lib/flyer-composer/types";

function resolveInspirationUrls(input: FlyerComposerGenerateInput): string[] {
  return resolveFlyerComposerOpenAiReferenceImageUrls(input);
}

function buildFlyerStoragePath(organizationId: string): string {
  return `flyer-composer/${organizationId}/${randomUUID()}.png`;
}

export async function generateFlyerComposerImage(
  input: FlyerComposerGenerateInput,
  organizationId: string,
): Promise<FlyerComposerGenerateImageResult> {
  if (!isAiConfigured()) {
    return {
      success: false,
      error: "AI image generation isn't set up yet.",
      imageUrl: null,
      imageBase64: null,
      aiUsed: false,
    };
  }

  const authUser = await getAuthUser();
  const userPrompt = buildFlyerComposerImagePrompt(input);
  const size = resolveFlyerComposerImageSize(input);
  const inspirationImageUrls = resolveInspirationUrls(input);

  const result = await generateArtworkV2ImageNative(
    {
      kind: "create",
      userPrompt,
      inspirationImageUrls,
    },
    size,
    null,
    undefined,
    {
      userId: authUser?.id ?? null,
      organizationId,
      isRegeneration: false,
      milestoneLabel: "flyer_composer",
      relativeDay: null,
    },
  );

  if (!result.success || !result.imageBase64) {
    return {
      success: false,
      error: result.error ?? "Unable to generate flyer artwork.",
      imageUrl: null,
      imageBase64: null,
      aiUsed: true,
    };
  }

  let imageBase64 = result.imageBase64;
  // Always stamp a real QR when a target URL exists — do not gate on
  // template.hasQr (Event / Letter / custom layouts still leave a blank square).
  const qrUrl = resolveFlyerComposerQrUrl(input);
  if (qrUrl) {
    const composited = await compositeFlyerQrCode({ imageBase64, qrUrl });
    if (composited) {
      imageBase64 = composited;
    }
  }

  const bytes = Buffer.from(imageBase64, "base64");
  const storagePath = buildFlyerStoragePath(organizationId);
  const uploaded = await uploadArtworkBytes({
    storagePath,
    bytes,
    contentType: "image/png",
  });

  if (uploaded.success && uploaded.publicUrl) {
    return {
      success: true,
      error: null,
      imageUrl: uploaded.publicUrl,
      imageBase64: null,
      aiUsed: true,
    };
  }

  // Storage unavailable — return data URL so preview still works
  return {
    success: true,
    error: null,
    imageUrl: null,
    imageBase64: `data:image/png;base64,${imageBase64}`,
    aiUsed: true,
  };
}
