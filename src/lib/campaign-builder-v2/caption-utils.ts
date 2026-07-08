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
