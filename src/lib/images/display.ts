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
  // Default height to match width (square) whenever a preset is used, even if
  // the caller overrode width for a specific size. Supabase's image
  // transform does NOT proportionally scale the omitted axis when only one
  // of width/height is given — it crops to the given axis and leaves the
  // other axis at the source image's native pixel size (e.g. width=128 on a
  // 1024x1024 source returns 128x1024, not a proportional 128x128). That
  // produced squished/sliced thumbs on Events/Volunteers/Approvals list rows.
  // Passing both axes (with resize=contain) lets Supabase letterbox
  // correctly so the full poster art stays visible without stretching.
  const height = options.height ?? (preset ? width : undefined);
  const quality = options.quality ?? preset?.quality ?? 72;
  const requestedResize = options.resize ?? preset?.resize ?? "cover";
  // cover/contain/fill need both axes.
  const resize = height != null ? requestedResize : undefined;

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
