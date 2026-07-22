import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

/**
 * Prefer the prefetched selectHeroArtwork result; otherwise use the event's
 * promoted approved-square URL so filtered/paginated rows still show a thumb.
 */
export function resolveEventsHomeListArtwork(
  event: Pick<Event, "approvedSquareImageUrl" | "approvedSquareImageStatus">,
  artwork: HeroArtworkSelection | null | undefined,
): HeroArtworkSelection | null {
  if (artwork?.imageUrl) {
    return artwork;
  }

  if (
    event.approvedSquareImageStatus === "filled" &&
    event.approvedSquareImageUrl
  ) {
    return {
      source: "approved_asset",
      caption: "Artwork ready",
      imageUrl: event.approvedSquareImageUrl,
      label: "Approved artwork",
      filename: null,
      aspectRatio: "square",
      assetType: "square_graphic",
    };
  }

  return artwork ?? null;
}
