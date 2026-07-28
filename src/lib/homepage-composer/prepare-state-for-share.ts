import { uploadHomepageComposerArtworkAction } from "@/lib/homepage-composer/artwork-actions";
import type { HomepageComposerState } from "@/lib/homepage-composer/types";

/**
 * Replace in-memory data: URLs with hosted https links so share pages work
 * outside the composer browser session.
 */
export async function prepareHomepageStateForShare(
  state: HomepageComposerState,
): Promise<{ state: HomepageComposerState; error: string | null }> {
  const nextCards = [...state.cards];
  let changed = false;

  for (let index = 0; index < nextCards.length; index += 1) {
    const card = nextCards[index];
    const url = card.imageUrl?.trim() ?? "";
    if (!url.startsWith("data:")) continue;

    const uploaded = await uploadHomepageComposerArtworkAction({
      cardId: card.id,
      dataUrl: url,
    });
    if (!uploaded.success || !uploaded.url) {
      return {
        state,
        error: uploaded.error ?? "Unable to upload artwork for sharing.",
      };
    }

    nextCards[index] = { ...card, imageUrl: uploaded.url };
    changed = true;
  }

  if (!changed) {
    return { state, error: null };
  }

  return {
    state: { ...state, cards: nextCards },
    error: null,
  };
}
