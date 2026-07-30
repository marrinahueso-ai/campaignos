import "server-only";

import type {
  FlyerComposerGenerateInput,
  FlyerComposerGenerateResult,
  FlyerComposerGeneratedSlots,
} from "@/lib/flyer-composer/types";
import { generateFlyerComposerImage } from "@/lib/flyer-composer/generate-image";

function inputFieldsAsSlots(
  input: FlyerComposerGenerateInput,
): FlyerComposerGeneratedSlots {
  return { ...input.fields };
}

/**
 * Primary path: OpenAI image generation (8 credits via generate_artwork).
 * Returns inspiration fields as secondary slot metadata for the sidebar.
 */
export async function generateFlyerComposer(
  input: FlyerComposerGenerateInput,
  organizationId: string,
): Promise<FlyerComposerGenerateResult> {
  const imageResult = await generateFlyerComposerImage(input, organizationId);

  if (!imageResult.success) {
    return {
      success: false,
      error: imageResult.error,
      imageUrl: null,
      imageBase64: null,
      slots: null,
      aiUsed: imageResult.aiUsed,
    };
  }

  return {
    success: true,
    error: null,
    imageUrl: imageResult.imageUrl,
    imageBase64: imageResult.imageBase64,
    slots: inputFieldsAsSlots(input),
    aiUsed: true,
  };
}
