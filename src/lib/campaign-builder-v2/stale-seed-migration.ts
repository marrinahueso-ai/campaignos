/**
 * Strip known default / stale seed strings from saved campaign builder sessions.
 * Older seeds baked volunteer CTAs and demo captions into milestones and previews.
 */

import type { MilestonePreviewContent } from "./types.ts";

/**
 * One-time data cleanup migration. `campaign_builder_sessions` is not
 * reachable via the Supabase Data API on this project (PGRST205 — the table
 * does not exist in PostgREST's schema cache for any role), so every real
 * Campaign Builder V2 session currently lives only in browser localStorage
 * (see `hydrateCampaignBuilderSession`'s `serverLoadSucceeded=false` branch,
 * which always lets local win when there is no server row).
 *
 * A one-off cleanup deleted all AI-generated artwork files under
 * `campaign-builder-v2/generated/` in Storage for the events below (see the
 * timestamped campaign-builder-artwork-cleanup backup folder under
 * backups/ in the repo root for the full record). Because
 * there is no reachable server copy to correct a stale local cache, any
 * artwork URL still cached in a returning user's localStorage for these
 * events now points at a deleted file. Strip it on hydrate instead of
 * displaying/treating it as generated content.
 */
const CLEARED_ARTWORK_EVENT_IDS = new Set([
  "19e5f8d8-6f5f-4446-a043-fbe7b4718e79",
  "1bdb2018-11ce-4610-9375-a1e382325d08",
  "1c3542db-3278-474a-8d7e-cc5445e4f2f0",
  "49112d75-208f-4730-b704-d27c968d6548",
  "57e72be6-a47f-4bdd-ae3c-aad0c0d58efc",
  "651efc5c-cf40-40c3-9d94-c1d16172f6cd",
  "723f85ce-e44f-43f6-97b5-723aa33ba7f8",
  "7db16be2-6a19-4e8c-a621-34546e362fc6",
]);

function isClearedGeneratedArtworkUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.includes("/campaign-builder-v2/generated/");
}

/** Drops dangling artwork references left over from the cleanup above; captions/notes/schedule are untouched. */
export function stripStaleClearedArtwork(
  eventId: string,
  content: MilestonePreviewContent,
): MilestonePreviewContent {
  if (!CLEARED_ARTWORK_EVENT_IDS.has(eventId)) {
    return content;
  }

  const feedStale = isClearedGeneratedArtworkUrl(content.artwork.feedUrl);
  const storyStale = isClearedGeneratedArtworkUrl(content.artwork.storyUrl);
  if (!feedStale && !storyStale) {
    return content;
  }

  return {
    ...content,
    artwork: {
      feedUrl: feedStale ? null : content.artwork.feedUrl,
      storyUrl: storyStale ? null : content.artwork.storyUrl,
    },
    status: "draft",
    generationStatus: undefined,
    generationStartedAt: null,
    approvalStatuses: content.approvalStatuses.map((entry) => ({
      ...entry,
      status: "not-started",
      timestamp: null,
    })),
  };
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
