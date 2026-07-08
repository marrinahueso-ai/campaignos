/** Matches ARTWORK_V2_MAX_INSPIRATION_IMAGES — inlined to keep unit tests path-alias-free. */
const MAX_INSPIRATION_IMAGES = 4;

/** Merges brand logos with user inspiration images, respecting the model limit. */
export function mergeInspirationImageUrls(
  inspirationUrls: string[],
  brandLogoUrls: string[],
): string[] {
  const merged = [...brandLogoUrls, ...inspirationUrls];
  return merged.slice(0, MAX_INSPIRATION_IMAGES);
}
