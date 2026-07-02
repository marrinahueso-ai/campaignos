import type { ArtworkMode } from "@/lib/ai-artwork/types";

export const EES_FALLBACK_BRAND_COLORS = ["navy", "green", "white"] as const;

export const ARTWORK_MODE_OPTIONS: {
  id: ArtworkMode;
  label: string;
  description: string;
}[] = [
  {
    id: "ready_to_post",
    label: "Ready to Post",
    description: "Complete graphic with event title and short date/time rendered in the image.",
  },
  {
    id: "background_only",
    label: "Background Only",
    description: "Artwork only — blank areas reserved for overlays added later.",
  },
  {
    id: "text_safe_layout",
    label: "Text-Safe Layout",
    description: "Designed layout with clear text-safe zones, no rendered copy.",
  },
];

export function parseArtworkMode(value: unknown): ArtworkMode {
  if (value === "ready_to_post" || value === "background_only" || value === "text_safe_layout") {
    return value;
  }
  return "ready_to_post";
}

export function resolveArtworkBrandColors(input: {
  brandColors: string[];
  briefPalette: string[];
}): string[] {
  const merged = [...input.brandColors, ...input.briefPalette]
    .map((color) => color.trim())
    .filter(Boolean);
  if (merged.length > 0) {
    return merged;
  }
  return [...EES_FALLBACK_BRAND_COLORS];
}

const READY_TO_POST_CONFLICT_PATTERNS = [
  /background only/i,
  /typography will be added later/i,
  /reserve blank/i,
  /no readable text/i,
  /overlay.*not in the image/i,
  /do not render.*text/i,
];

export function detectReadyToPostPromptConflicts(prompt: string): string[] {
  const conflicts: string[] = [];
  for (const pattern of READY_TO_POST_CONFLICT_PATTERNS) {
    if (pattern.test(prompt)) {
      conflicts.push(pattern.source);
    }
  }
  return conflicts;
}

export function assertReadyToPostPrompt(mode: ArtworkMode, prompt: string): void {
  if (mode !== "ready_to_post" || process.env.NODE_ENV !== "development") {
    return;
  }

  const conflicts = detectReadyToPostPromptConflicts(prompt);
  if (conflicts.length > 0) {
    console.warn("Ready-to-post prompt conflict detected.", { conflicts });
  }
}
