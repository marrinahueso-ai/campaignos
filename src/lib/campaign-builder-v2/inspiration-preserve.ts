/**
 * Helpers to keep Creative Setup inspiration images intact across generation.
 *
 * A previous localStorage "slim" path cleared non-http URLs and a quota
 * fallback wrote `inspirationImages: []`, so generating milestone 2+ ran
 * without the inspiration that shaped milestone 1.
 */

import type {
  CampaignBuilderInspiration,
  InspirationImage,
} from "./types.ts";

function isHttpUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export function countHttpInspirationImages(
  images: InspirationImage[] | null | undefined,
): number {
  return (images ?? []).filter(
    (image) => isHttpUrl(image.url) || isHttpUrl(image.previewUrl),
  ).length;
}

export function inspirationImageHasDisplayableSource(
  image: InspirationImage,
): boolean {
  return Boolean(
    isHttpUrl(image.url) ||
      isHttpUrl(image.previewUrl) ||
      image.previewUrl?.startsWith("blob:"),
  );
}

/** Drop only fully empty shells — never remove blob or http inspiration rows. */
export function slimInspirationImagesForStorage(
  images: InspirationImage[],
): InspirationImage[] {
  return images
    .map((image) => {
      const httpUrl = isHttpUrl(image.url)
        ? image.url!.trim()
        : isHttpUrl(image.previewUrl)
          ? image.previewUrl!.trim()
          : null;

      if (httpUrl) {
        return {
          ...image,
          url: httpUrl,
          previewUrl: httpUrl,
        };
      }

      // Keep blob previews in the live session path; they cannot be serialized
      // across reloads, but we must not turn them into empty {url:""} rows that
      // later overwrite good http inspiration via updatedInspiration merges.
      if (image.previewUrl?.startsWith("blob:")) {
        return image;
      }

      return null;
    })
    .filter((image): image is InspirationImage => image !== null);
}

/**
 * Apply server-resolved inspiration after generation without ever wiping a
 * richer client-side inspiration set.
 */
export function mergeInspirationAfterGeneration(
  current: CampaignBuilderInspiration,
  updated: CampaignBuilderInspiration | null | undefined,
): CampaignBuilderInspiration {
  if (!updated) {
    return current;
  }

  const currentHttp = countHttpInspirationImages(current.inspirationImages);
  const updatedHttp = countHttpInspirationImages(updated.inspirationImages);
  const currentCount = current.inspirationImages?.length ?? 0;
  const updatedCount = updated.inspirationImages?.length ?? 0;

  // Never replace real inspiration with an empty/weaker server payload.
  if (updatedHttp < currentHttp || (updatedCount === 0 && currentCount > 0)) {
    return {
      ...current,
      ...updated,
      inspirationImages: current.inspirationImages,
      inspirationOverallComment:
        updated.inspirationOverallComment?.trim() ||
        current.inspirationOverallComment,
    };
  }

  // Merge by id so comments/urls survive partial server updates.
  const currentById = new Map(
    (current.inspirationImages ?? []).map((image) => [image.id, image]),
  );
  const mergedImages = (updated.inspirationImages ?? []).map((image) => {
    const previous = currentById.get(image.id);
    if (!previous) {
      return image;
    }
    const url =
      (isHttpUrl(image.url) ? image.url : null) ??
      (isHttpUrl(previous.url) ? previous.url : null) ??
      image.url ??
      previous.url;
    const previewUrl =
      (isHttpUrl(image.previewUrl) ? image.previewUrl : null) ??
      (isHttpUrl(url) ? url : null) ??
      (isHttpUrl(previous.previewUrl) ? previous.previewUrl : null) ??
      previous.previewUrl ??
      image.previewUrl;
    return {
      ...previous,
      ...image,
      url,
      previewUrl,
      comment: image.comment?.trim() || previous.comment,
    };
  });

  // If the server returned nothing usable, keep current images.
  const finalImages =
    mergedImages.length > 0 ? mergedImages : current.inspirationImages;

  return {
    ...current,
    ...updated,
    inspirationImages: finalImages,
  };
}
