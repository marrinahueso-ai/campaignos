import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";

export function hasDisplayableArtwork(
  artwork: HeroArtworkSelection | null,
): artwork is HeroArtworkSelection {
  return Boolean(artwork?.imageUrl);
}
