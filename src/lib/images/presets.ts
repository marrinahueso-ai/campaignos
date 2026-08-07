/**
 * Display-only size presets for Supabase Image Transformations.
 * Originals stay at storage_path / public object URLs — never persist these.
 */

export const IMAGE_DISPLAY_PRESETS = {
  /** List rows, table cells, compact chips (~40–64px CSS). */
  thumb: { width: 128, quality: 72, resize: "cover" as const },
  /** Grid tiles, focus cards, library galleries (~180–360px CSS). */
  card: { width: 360, quality: 72, resize: "cover" as const },
  /** Dashboard / event heroes (~280–800px CSS). */
  hero: { width: 800, quality: 75, resize: "cover" as const },
  /** Side panel / selected preview (still bounded). */
  detail: { width: 800, quality: 78, resize: "cover" as const },
} as const;

export type ImageDisplayPreset = keyof typeof IMAGE_DISPLAY_PRESETS;

export type ImageDisplayResize = "contain" | "cover" | "fill";

export type ImageDisplayIntent = "display" | "original";
