/** Email content width used when scaling into the Library card thumbnail. */
export const NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH = 560;

/**
 * Scale a 560px email so it covers the library card thumbnail width.
 * Height overflow is cropped; side letterboxing is the bug this avoids.
 */
export function newsletterLibraryPreviewScale(
  containerWidth: number,
  sourceWidth = NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH,
): number {
  if (containerWidth <= 0 || sourceWidth <= 0) return 0;
  return containerWidth / sourceWidth;
}
