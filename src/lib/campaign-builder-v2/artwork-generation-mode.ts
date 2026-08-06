import { isPlaceholderArtworkUrl } from "./platform-utils.ts";
import type { ArtworkView } from "./types.ts";

/**
 * When Story is derived from Feed, use the same adjust pipeline as Edit Post
 * on 1:1 — never a separate "create new concept" pass.
 */
export const STORY_FROM_FEED_ADJUST_INSTRUCTION =
  "Adapt this exact design to vertical 9:16 story format. Keep the same artwork, colors, typography, subjects, and on-graphic text. Only recompose layout for story safe zones — do not invent a new concept or new CTAs.";

export type MilestoneArtworkGenerationPass = {
  view: ArtworkView;
  /** True when Story is adapting the current Feed image. */
  storyFromFeed: boolean;
  /** Use image-edit (adjust) instead of create-from-scratch. */
  isAdjust: boolean;
  previousImageUrl: string | null;
  extraInstructions: string | null;
  adjustmentComments: string | null;
};

function usableUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() || null;
  if (!trimmed || isPlaceholderArtworkUrl(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Decide how to generate one artwork slot. Feed regenerations with direction
 * adjust the existing feed; Story always adjusts from the latest feed when
 * available, using the same user direction.
 */
export function resolveMilestoneArtworkGenerationPass(input: {
  view: ArtworkView;
  existingUrl: string | null | undefined;
  feedUrl: string | null | undefined;
  /** Style-lock-prefixed Edit Post / artwork notes (may be empty). */
  lockedInstructions: string;
}): MilestoneArtworkGenerationPass {
  const existingUrl = usableUrl(input.existingUrl);
  const feedUrl = usableUrl(input.feedUrl);
  const storyFromFeed = input.view === "story" && Boolean(feedUrl);
  const instructions = input.lockedInstructions.trim();

  if (input.view === "feed" && existingUrl && instructions) {
    return {
      view: "feed",
      storyFromFeed: false,
      isAdjust: true,
      previousImageUrl: existingUrl,
      extraInstructions: null,
      adjustmentComments: instructions,
    };
  }

  if (storyFromFeed && feedUrl) {
    const adjustmentComments = instructions
      ? `${instructions}\n\n${STORY_FROM_FEED_ADJUST_INSTRUCTION}`
      : STORY_FROM_FEED_ADJUST_INSTRUCTION;
    return {
      view: "story",
      storyFromFeed: true,
      isAdjust: true,
      previousImageUrl: feedUrl,
      extraInstructions: null,
      adjustmentComments,
    };
  }

  return {
    view: input.view,
    storyFromFeed: false,
    isAdjust: false,
    previousImageUrl: null,
    extraInstructions: instructions || null,
    adjustmentComments: null,
  };
}
