import { isFlyerComposerReferenceImageUrl } from "@/lib/flyer-composer/reference-images";

/** Prefer the social campaign Event Image, then event-workspace hero, then approved square. */
export function resolveFlyerEventInspirationUrl(input: {
  socialFeedUrl?: string | null;
  heroArtworkUrl?: string | null;
  approvedSquareUrl?: string | null;
}): string | null {
  for (const candidate of [
    input.socialFeedUrl,
    input.heroArtworkUrl,
    input.approvedSquareUrl,
  ]) {
    const trimmed = candidate?.trim() || null;
    if (isFlyerComposerReferenceImageUrl(trimmed)) return trimmed;
  }
  return null;
}
