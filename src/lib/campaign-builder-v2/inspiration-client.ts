"use client";

import type {
  InspirationImage,
  InspirationImagePayload,
} from "@/lib/campaign-builder-v2/types";

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read inspiration image."));
    reader.readAsDataURL(blob);
  });
}

/** Ensures inspiration images are serializable for server actions (uploads blob previews as data URLs). */
export async function prepareInspirationImagesForServer(
  images: InspirationImage[],
): Promise<InspirationImagePayload[]> {
  return Promise.all(
    images.map(async (image) => {
      if (image.url?.trim()) {
        return image;
      }

      if (image.previewUrl?.startsWith("blob:")) {
        try {
          const dataUrl = await blobUrlToDataUrl(image.previewUrl);
          return { ...image, dataUrl };
        } catch {
          return image;
        }
      }

      return image;
    }),
  );
}
