/**
 * Strip known default / stale seed strings from saved campaign builder sessions.
 * Older seeds baked volunteer CTAs and demo captions into milestones and previews.
 */

import type { MilestonePreviewContent } from "./types.ts";

/**
 * @deprecated The one-off AI artwork storage purge used to strip every
 * `/campaign-builder-v2/generated/` URL on hydrate for a fixed event-id list.
 * That ran after EVERY generation/remount (not once), deleting new artwork.
 * Kept as a no-op export so old imports/tests do not break. Do not restore
 * the strip behavior.
 */
export function stripStaleClearedArtwork(
  _eventId: string,
  content: MilestonePreviewContent,
): MilestonePreviewContent {
  return content;
}

const KNOWN_STALE_CAPTION_NOTES = new Set(
  [
    "Mention volunteer sign-up link",
    "Thank volunteers and families",
    "Warm welcome tone, include event date",
    "List top 3 things to expect",
    "Short, exciting live update",
    "Warm gratitude tone for families",
  ].map((value) => value.toLowerCase()),
);

const KNOWN_STALE_ARTWORK_NOTES = new Set(
  [
    "Highlight volunteer CTA",
    "Bold headline, vintage school poster style",
    "Countdown visual, energetic layout",
    "Live now badge, booth location",
    "Photo collage style recap",
  ].map((value) => value.toLowerCase()),
);

const STALE_NOTE_SUBSTRINGS = [
  "volunteer",
  "sign-up",
  "sign up",
  "signup",
  "parking",
  "gate time",
  "help welcome",
  "mention volunteer",
  "highlight volunteer",
] as const;

const KNOWN_STALE_PURPOSES: Record<string, string> = {
  "remind families about the event and encourage volunteer sign-ups":
    "Build excitement and drive attendance two weeks before the event",
  "remind families about volunteer opportunities and event details":
    "Build excitement and drive attendance two weeks before the event",
  "share photos, thank volunteers, and celebrate success":
    "Share photos and celebrate event success",
};

/** Demo captions shipped in early campaign builder seeds (not user-authored). */
export const KNOWN_STALE_DEMO_CAPTIONS = new Set(
  [
    "Mark your calendars! Our Back to School Fair is coming up on August 15. Join us for food, fun, and community connection. See you there!",
    "Save the date! Back to School Fair — Aug 15. Food, fun & community. Link in bio for details.",
    "Two weeks until our Back to School Fair! Mark your calendar and get ready for food, fun, and community connection.",
    "2 weeks to go! Back to School Fair — save the date and spread the word.",
    "One week away! Here's what to expect: welcome stations, classroom visits, PTO info booth, and treats for the kids. August 15 — don't miss it!",
    "1 week countdown! Welcome stations, treats & PTO info. Aug 15.",
    "Tomorrow is the day! We're excited to see our families at the Back to School Fair. See you there!",
    "TOMORROW! Back to School Fair — see you soon!",
    "We're LIVE at the Back to School Fair! Stop by the PTO booth for your welcome packet and say hi to our volunteers.",
    "We're here! Back to School Fair is happening NOW. Come say hi!",
    "What a wonderful Back to School Fair! Thank you to every volunteer and family who made it special. Swipe through for highlights from the night.",
    "Thank you, EES families! Back to School Fair recap — swipe for the best moments.",
  ].map((value) => value.toLowerCase()),
);

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase();
}

function containsStaleSubstring(value: string): boolean {
  const lower = normalizeComparable(value);
  return STALE_NOTE_SUBSTRINGS.some((fragment) => lower.includes(fragment));
}

export function isStaleSeedNote(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return false;
  }

  const lower = normalizeComparable(trimmed);
  if (KNOWN_STALE_CAPTION_NOTES.has(lower) || KNOWN_STALE_ARTWORK_NOTES.has(lower)) {
    return true;
  }

  return containsStaleSubstring(trimmed);
}

export function sanitizeSeedNotes(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || isStaleSeedNote(trimmed)) {
    return "";
  }
  return trimmed;
}

/** Demo/example campaign-level AI guidance shipped in early seeds — never real user input. */
const KNOWN_STALE_GLOBAL_AI_GUIDANCE = new Set(
  [
    "Vintage school look. Cream background. Navy and green are our primary colors. Include playful school elements like pencils, apples, and chalkboard textures. Keep text readable and welcoming for families.",
  ].map((value) => value.toLowerCase()),
);

export function isStaleGlobalAiGuidance(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return false;
  }
  return KNOWN_STALE_GLOBAL_AI_GUIDANCE.has(normalizeComparable(trimmed));
}

export function sanitizeGlobalAiGuidance(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || isStaleGlobalAiGuidance(trimmed)) {
    return "";
  }
  return trimmed;
}

export function sanitizeSeedPurpose(
  purpose: string | null | undefined,
  milestoneName: string,
): string {
  const trimmed = purpose?.trim() ?? "";
  if (!trimmed) {
    return trimmed;
  }

  const mapped = KNOWN_STALE_PURPOSES[normalizeComparable(trimmed)];
  if (mapped) {
    return mapped;
  }

  if (containsStaleSubstring(trimmed)) {
    const name = milestoneName.trim().toLowerCase();
    if (name.includes("thank") || name.includes("recap")) {
      return "Share photos and celebrate event success";
    }
    if (name.includes("two") && name.includes("week")) {
      return "Build excitement and drive attendance two weeks before the event";
    }
    if (name.includes("one") && name.includes("week")) {
      return "Drive attendance with schedule highlights";
    }
    return trimmed.replace(/\bvolunteer[s]?\b/gi, "").replace(/\s+/g, " ").trim();
  }

  return trimmed;
}

export function isStaleDemoCaption(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return false;
  }

  const lower = normalizeComparable(trimmed);
  if (KNOWN_STALE_DEMO_CAPTIONS.has(lower)) {
    return true;
  }

  return (
    lower.includes("volunteer") ||
    lower.includes("sign up today") ||
    lower.includes("volunteer spots")
  );
}
