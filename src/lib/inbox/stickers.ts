/** Built-in quick emoji pack + helpers for Communications Hub reactions.
 *
 * Custom image stickers live in `organization_stickers` (Supabase storage).
 * This emoji pack remains a lightweight insert into the text composer.
 */

export type InboxSticker = {
  id: string;
  emoji: string;
  label: string;
};

export const INBOX_STICKER_PACK: readonly InboxSticker[] = [
  { id: "wave", emoji: "👋", label: "Wave" },
  { id: "party", emoji: "🎉", label: "Party" },
  { id: "hearts", emoji: "💕", label: "Hearts" },
  { id: "star", emoji: "🌟", label: "Star" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "pray", emoji: "🙏", label: "Thanks" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "cool", emoji: "😎", label: "Cool" },
  { id: "celebrate", emoji: "🥳", label: "Celebrate" },
  { id: "hug", emoji: "🤗", label: "Hug" },
  { id: "strong", emoji: "💪", label: "Strong" },
  { id: "sparkle", emoji: "✨", label: "Sparkle" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "check", emoji: "✅", label: "Done" },
  { id: "trophy", emoji: "🏆", label: "Trophy" },
] as const;

export const BUBBLE_QUICK_REACTIONS = ["👍", "❤️"] as const;
export type BubbleQuickReaction = (typeof BUBBLE_QUICK_REACTIONS)[number];

export function isBubbleQuickReaction(value: unknown): value is BubbleQuickReaction {
  return value === "👍" || value === "❤️";
}

export function readLocalMessageReaction(
  metadata: Record<string, unknown> | null | undefined,
): BubbleQuickReaction | null {
  if (!metadata) {
    return null;
  }
  return isBubbleQuickReaction(metadata.localReaction) ? metadata.localReaction : null;
}

export function readMessageStickerUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) {
    return null;
  }
  const url = metadata.stickerUrl;
  return typeof url === "string" && url.trim() ? url : null;
}
