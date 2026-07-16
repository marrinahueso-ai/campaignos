import type { PlatformCaption } from "@/lib/campaign-builder-v2/types";

export function getSharedCaptionText(captions: PlatformCaption[]): string {
  const withText = captions.find((caption) => caption.text.trim().length > 0);
  return withText?.text ?? captions[0]?.text ?? "";
}

export function syncCaptionsToPlatforms(
  text: string,
  platforms: Array<"facebook" | "instagram">,
): PlatformCaption[] {
  return platforms.map((platform) => ({ platform, text }));
}

/**
 * Campaign Builder uses one shared caption for Facebook & Instagram.
 * If any platform has text, mirror it onto every required platform so
 * completeness checks and publishes never treat Instagram (or Facebook)
 * as missing when the shared caption is present.
 */
export function ensureSharedCaptionsForPlatforms(
  captions: PlatformCaption[],
  platforms: Array<"facebook" | "instagram">,
): PlatformCaption[] {
  if (platforms.length === 0) {
    return captions;
  }

  const shared = getSharedCaptionText(captions);
  if (!shared.trim()) {
    return platforms.map((platform) => ({
      platform,
      text: captions.find((caption) => caption.platform === platform)?.text ?? "",
    }));
  }

  return syncCaptionsToPlatforms(shared, platforms);
}
