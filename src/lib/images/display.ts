import {
  IMAGE_DISPLAY_PRESETS,
  type ImageDisplayIntent,
  type ImageDisplayPreset,
  type ImageDisplayResize,
} from "./presets.ts";
import { toSupabaseThumbnailUrl } from "./supabase-thumbnail.ts";

export type {
  ImageDisplayIntent,
  ImageDisplayPreset,
  ImageDisplayResize,
} from "./presets.ts";
export { IMAGE_DISPLAY_PRESETS } from "./presets.ts";

export type ToDisplayImageUrlOptions = {
  /** display = transform when possible; original = never transform. Default display. */
  intent?: ImageDisplayIntent;
  preset?: ImageDisplayPreset;
  /** Override transform width (defaults from preset, else 360). */
  width?: number;
  height?: number;
  quality?: number;
  resize?: ImageDisplayResize;
};

/**
 * Derive a display URL at render time. Never persist the result.
 * Public Supabase object URLs become Image Transformation URLs; everything
 * else (signed, blob, data, remote CDN) is returned unchanged.
 */
export function toDisplayImageUrl(
  source: string,
  options: ToDisplayImageUrlOptions = {},
): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  if ((options.intent ?? "display") === "original") {
    return trimmed;
  }

  const preset = options.preset
    ? IMAGE_DISPLAY_PRESETS[options.preset]
    : null;
  const width = options.width ?? preset?.width ?? 360;
  // Only default a square height when the caller did not pass an explicit width
  // (preset-only). Explicit widths keep aspect unless height is also set.
  const height =
    options.height ??
    (options.width == null && preset ? preset.width : undefined);
  const quality = options.quality ?? preset?.quality ?? 72;
  const resize = options.resize ?? preset?.resize ?? "cover";

  return toSupabaseThumbnailUrl(trimmed, {
    width,
    height,
    quality,
    resize,
  });
}

/** True when next/image remotePatterns can optimize this host. */
export function canOptimizeWithNextImage(source: string): boolean {
  try {
    const url = new URL(source.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** Blob / data URLs must use a plain <img>, not next/image. */
export function isLocalOrDataImageUrl(source: string): boolean {
  const trimmed = source.trim().toLowerCase();
  return (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  );
}
