import { artworkKeyForView } from "./platform-utils.ts";
import type { ArtworkView, MilestoneArtwork } from "./types.ts";

/** Drop one generated artwork slot (feed or story) so the user can regenerate. */
export function rejectArtworkView(
  artwork: MilestoneArtwork,
  view: ArtworkView,
): MilestoneArtwork {
  const key = artworkKeyForView(view);
  return {
    ...artwork,
    [key]: null,
  };
}
