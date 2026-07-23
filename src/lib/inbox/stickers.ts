/** Built-in sticker pack for Communications Hub replies.
 *
 * Meta Graph reply paths in this app are text-only today, and custom sticker
 * send is not available. These stickers insert as large emoji into the
 * composer so the UX stays useful until Meta sticker/attachment send lands.
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
