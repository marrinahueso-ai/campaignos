import "server-only";

import { requireEventAccess } from "@/lib/events/queries";
import {
  MAX_EVENT_ASSET_BYTES,
  resolveAssetImageUrl,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import type {
  InspirationImage,
  InspirationImagePayload,
} from "@/lib/campaign-builder-v2/types";
import { uploadSchoolMediaBytes } from "@/lib/school-media/storage";

export type { InspirationImagePayload };

/** Data URLs are entirely client-authored — their declared MIME is no more
 * trustworthy than a raw file.type header, so only allow real image types. */
const ALLOWED_INSPIRATION_DATA_URL_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

async function uploadDataUrlImage(input: {
  eventId: string;
  organizationId: string;
  dataUrl: string;
  label: string;
  index: number;
}): Promise<{ url: string | null; error?: string }> {
  const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match?.[2]) {
    return { url: null, error: "Invalid inspiration image data." };
  }

  const contentType = match[1]?.trim().toLowerCase() || "";
  if (!ALLOWED_INSPIRATION_DATA_URL_MIME_TYPES.has(contentType)) {
    return {
      url: null,
      error: "Inspiration images must be PNG, JPG, WebP, or GIF.",
    };
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_EVENT_ASSET_BYTES) {
    return {
      url: null,
      error: "Inspiration images must be 10 MB or smaller.",
    };
  }

  const uploaded = await uploadSchoolMediaBytes({
    organizationId: input.organizationId,
    eventId: input.eventId,
    bytes,
    contentType,
    filename: sanitizeEventAssetFilename(input.label || "inspiration.png"),
    index: input.index,
  });

  if (!uploaded.success || !uploaded.signedUrl) {
    return {
      url: null,
      error: uploaded.error ?? "Unable to upload inspiration image.",
    };
  }

  return { url: uploaded.signedUrl };
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

/**
 * Uploads pending inspiration images to the private school-media bucket and
 * returns time-limited signed URLs for generation (not permanent public CDN URLs).
 */
export async function persistInspirationImages(
  eventId: string,
  images: InspirationImagePayload[],
): Promise<{
  urls: string[];
  updatedImages: InspirationImage[];
  error?: string;
}> {
  const access = await requireEventAccess(eventId);
  if ("error" in access) {
    return {
      urls: [],
      updatedImages: [],
      error: access.error,
    };
  }

  if (images.length > ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
    return {
      urls: [],
      updatedImages: [],
      error: `You can attach up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images.`,
    };
  }

  const organizationId =
    access.access?.organizationId?.trim() ||
    (await import("@/lib/auth/organization-context").then((m) =>
      m.getCurrentOrganization(),
    ).then((org) => org?.id?.trim() || ""));
  if (!organizationId) {
    return {
      urls: [],
      updatedImages: [],
      error: "Could not resolve organization for this event.",
    };
  }

  const urls: string[] = [];
  const updatedImages: InspirationImage[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]!;
    let url = resolvePersistedImageUrl(image.url);

    if (!url && image.dataUrl?.trim()) {
      const uploaded = await uploadDataUrlImage({
        eventId,
        organizationId,
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
