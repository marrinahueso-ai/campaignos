import "server-only";

import { createConceptBatchId } from "@/lib/ai-artwork/mutations";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import {
  resolveAssetImageUrl,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import type {
  InspirationImage,
  InspirationImagePayload,
} from "@/lib/campaign-builder-v2/types";

export type { InspirationImagePayload };

function buildInspirationStoragePath(
  eventId: string,
  batchId: string,
  filename: string,
  index: number,
): string {
  const safeName = sanitizeEventAssetFilename(filename);
  return `${eventId}/campaign-builder-v2/inspiration/${batchId}/${index}-${safeName}`;
}

async function uploadDataUrlImage(input: {
  eventId: string;
  batchId: string;
  dataUrl: string;
  label: string;
  index: number;
}): Promise<{ url: string | null; error?: string }> {
  const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match?.[2]) {
    return { url: null, error: "Invalid inspiration image data." };
  }

  const contentType = match[1]?.trim() || "image/png";
  const bytes = Buffer.from(match[2], "base64");
  const storagePath = buildInspirationStoragePath(
    input.eventId,
    input.batchId,
    input.label || "inspiration.png",
    input.index,
  );

  const uploaded = await uploadArtworkBytes({
    storagePath,
    bytes,
    contentType,
  });

  if (!uploaded.success || !uploaded.publicUrl) {
    return {
      url: null,
      error: uploaded.error ?? "Unable to upload inspiration image.",
    };
  }

  return { url: uploaded.publicUrl };
}

function resolvePersistedImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("blob:")) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return resolveAssetImageUrl(trimmed) ?? trimmed;
}

/** Uploads pending inspiration images and returns stable public URLs for generation. */
export async function persistInspirationImages(
  eventId: string,
  images: InspirationImagePayload[],
): Promise<{
  urls: string[];
  updatedImages: InspirationImage[];
  error?: string;
}> {
  if (images.length > ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
    return {
      urls: [],
      updatedImages: [],
      error: `You can attach up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images.`,
    };
  }

  const batchId = createConceptBatchId();
  const urls: string[] = [];
  const updatedImages: InspirationImage[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]!;
    let url = resolvePersistedImageUrl(image.url);

    if (!url && image.dataUrl?.trim()) {
      const uploaded = await uploadDataUrlImage({
        eventId,
        batchId,
        dataUrl: image.dataUrl.trim(),
        label: image.label,
        index: index + 1,
      });

      if (!uploaded.url) {
        return {
          urls: [],
          updatedImages: [],
          error:
            uploaded.error ??
            `Could not upload inspiration image "${image.label || "image"}".`,
        };
      }

      url = uploaded.url;
    }

    if (url) {
      urls.push(url);
    }

    updatedImages.push({
      id: image.id,
      label: image.label,
      url,
      previewUrl: url ?? image.previewUrl ?? null,
      // Preserve the per-image AI comment through persistence — without this,
      // resolving inspiration for generation (and writing the result back
      // into session state) silently wiped every inspiration image comment
      // the user had typed after the very first generation call.
      comment: image.comment?.trim() ? image.comment.trim() : undefined,
    });
  }

  return { urls, updatedImages };
}
