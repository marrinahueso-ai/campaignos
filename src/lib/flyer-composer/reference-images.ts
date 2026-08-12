import type {
  FlyerComposerAssetContext,
  FlyerComposerBrandKit,
  FlyerComposerGenerateInput,
} from "@/lib/flyer-composer/types";

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
  if (
    assets.inspirationPhotoPresent &&
    assets.inspirationPhotoSource &&
    isFlyerComposerReferenceImageUrl(assets.inspirationPhotoUrl)
  ) {
    urls.push(assets.inspirationPhotoUrl!.trim());
  }
  if (isFlyerComposerReferenceImageUrl(assets.customTemplateImageUrl)) {
    urls.push(assets.customTemplateImageUrl!.trim());
  }
  return urls;
}

/**
 * Inspiration / template refs plus optional brand logo when brand is enabled
 * and a logo URL is selected.
 */
export function resolveFlyerComposerOpenAiReferenceImageUrls(
  input: Pick<FlyerComposerGenerateInput, "assets" | "brandEnabled" | "brandKit">,
): string[] {
  const urls = resolveFlyerComposerReferenceImageUrls(input.assets);
  if (input.brandEnabled) {
    const logoUrl = resolveSelectedLogoReferenceUrl(input.brandKit);
    if (logoUrl) urls.push(logoUrl);
  }
  return urls;
}

export function resolveSelectedLogoReferenceUrl(
  brandKit: FlyerComposerBrandKit | null | undefined,
): string | null {
  if (!isFlyerComposerReferenceImageUrl(brandKit?.selectedLogoUrl)) {
    return null;
  }
  return brandKit!.selectedLogoUrl!.trim();
}
