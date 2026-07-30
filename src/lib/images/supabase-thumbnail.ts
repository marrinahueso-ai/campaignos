const SUPABASE_PUBLIC_OBJECT_PATH =
  /^\/storage\/v1\/object\/public\/(.+)$/;

type SupabaseThumbnailOptions = {
  width: number;
  height?: number;
  quality?: number;
  resize?: "contain" | "cover" | "fill";
};

/**
 * Returns a bounded Supabase Image Transformation URL for a public object.
 *
 * `next/image` still optimizes the returned source for the requesting device,
 * but the upstream fetch is capped too. This prevents the optimizer from
 * downloading multi-megabyte originals before it can create a derivative.
 */
export function toSupabaseThumbnailUrl(
  source: string,
  { width, height, quality = 72, resize }: SupabaseThumbnailOptions,
): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const objectPath = url.pathname.match(SUPABASE_PUBLIC_OBJECT_PATH);
    if (!url.hostname.endsWith(".supabase.co") || !objectPath) {
      return trimmed;
    }

    url.pathname = `/storage/v1/render/image/public/${objectPath[1]}`;
    url.searchParams.set("width", String(Math.min(800, Math.max(1, Math.round(width)))));
    if (height) {
      url.searchParams.set(
        "height",
        String(Math.min(800, Math.max(1, Math.round(height)))),
      );
    }
    if (resize) {
      url.searchParams.set("resize", resize);
    }
    url.searchParams.set(
      "quality",
      String(Math.min(100, Math.max(20, Math.round(quality)))),
    );
    return url.toString();
  } catch {
    return trimmed;
  }
}
