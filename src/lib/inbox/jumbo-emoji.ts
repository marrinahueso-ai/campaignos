/**
 * Messenger-style jumbo emoji detection for Communications Hub bubbles + composer.
 *
 * Jumbo applies when the trimmed body is 1–3 emoji graphemes and nothing else
 * (no letters, digits, punctuation, or internal whitespace).
 */

export type JumboEmojiCount = 1 | 2 | 3;

const MAX_JUMBO_EMOJIS = 3;

/** Flag emoji: a pair of regional indicator symbols (e.g. 🇨🇦). */
const FLAG_EMOJI = /^\p{Regional_Indicator}{2}$/u;

/** Keycap sequences: 1️⃣ #️⃣ *️⃣ */
const KEYCAP_EMOJI = /^[0-9#*]\uFE0F?\u20E3$/u;

/** Starts with an Extended_Pictographic (covers ZWJ sequences, skin tones, VS16). */
const PICTOGRAPHIC_EMOJI = /^\p{Extended_Pictographic}/u;

let graphemeSegmenter: Intl.Segmenter | null = null;

function getGraphemeSegmenter(): Intl.Segmenter {
  if (!graphemeSegmenter) {
    graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  }
  return graphemeSegmenter;
}

function isEmojiGrapheme(grapheme: string): boolean {
  return (
    PICTOGRAPHIC_EMOJI.test(grapheme) ||
    FLAG_EMOJI.test(grapheme) ||
    KEYCAP_EMOJI.test(grapheme)
  );
}

/**
 * Returns 1 | 2 | 3 when `text` is emoji-only within the jumbo limit; otherwise null.
 *
 * Rules:
 * - Outer whitespace is ignored (trimmed).
 * - Internal whitespace or any non-emoji grapheme → not jumbo.
 * - 1 emoji → largest; 2–3 → large; 4+ → not jumbo.
 */
export function getJumboEmojiCount(text: string): JumboEmojiCount | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }

  const graphemes = Array.from(
    getGraphemeSegmenter().segment(trimmed),
    (part) => part.segment,
  );

  if (graphemes.length < 1 || graphemes.length > MAX_JUMBO_EMOJIS) {
    return null;
  }

  if (!graphemes.every(isEmojiGrapheme)) {
    return null;
  }

  return graphemes.length as JumboEmojiCount;
}
