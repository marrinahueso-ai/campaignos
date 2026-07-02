import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";

export type ArtworkObjectFit = "contain";

/** Generated artwork is always shown in full — never cropped. */
export function getArtworkObjectFit(
  artwork: HeroArtworkSelection,
): ArtworkObjectFit {
  void artwork;
  return "contain";
}
