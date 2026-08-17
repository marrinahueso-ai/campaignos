/** Matches ARTWORK_V2_MAX_INSPIRATION_IMAGES — inlined to keep unit tests path-alias-free. */
const MAX_INSPIRATION_IMAGES = 10;

/** Dedupes and caps reference URLs. Earlier URLs win when over the limit. */
export function capInspirationImageUrls(urls: string[]): string[] {
  const unique: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || unique.includes(trimmed)) {
      continue;
    }
    unique.push(trimmed);
    if (unique.length >= MAX_INSPIRATION_IMAGES) {
      break;
    }
  }
  return unique;
}

/**
 * Merges user inspiration with brand logos.
 * User inspiration is kept first so logos never evict loaded references.
 */
export function mergeInspirationImageUrls(
  inspirationUrls: string[],
  brandLogoUrls: string[],
): string[] {
  return capInspirationImageUrls([...inspirationUrls, ...brandLogoUrls]);
}
