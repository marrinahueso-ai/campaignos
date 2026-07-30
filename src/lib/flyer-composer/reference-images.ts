import type { FlyerComposerAssetContext } from "@/lib/flyer-composer/types";

/** Accepts data URLs and remote http(s) URLs for OpenAI image reference input. */
export function isFlyerComposerReferenceImageUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  );
}

/** Inspiration photo first, then custom template image (PDFs excluded). */
export function resolveFlyerComposerReferenceImageUrls(
  assets: FlyerComposerAssetContext,
): string[] {
  const urls: string[] = [];
  if (isFlyerComposerReferenceImageUrl(assets.inspirationPhotoUrl)) {
    urls.push(assets.inspirationPhotoUrl!.trim());
  }
  if (isFlyerComposerReferenceImageUrl(assets.customTemplateImageUrl)) {
    urls.push(assets.customTemplateImageUrl!.trim());
  }
  return urls;
}
