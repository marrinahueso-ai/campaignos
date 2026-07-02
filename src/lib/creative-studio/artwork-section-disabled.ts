/** Artwork / Creative Studio user experience is disabled while the section is rebuilt. */
export const ARTWORK_SECTION_DISABLED = true;

export const ARTWORK_REBUILD_TITLE = "Artwork is being rebuilt.";

export const ARTWORK_REBUILD_DESCRIPTION =
  "We're simplifying this section so artwork starts with your prompt and your inspiration image.";

export const ARTWORK_REBUILD_INLINE_MESSAGE = "Artwork tools are being rebuilt.";

export const ARTWORK_GENERATION_DISABLED_MESSAGE =
  "Artwork generation is temporarily unavailable while this section is rebuilt.";

export function isArtworkSectionDisabled(): boolean {
  return ARTWORK_SECTION_DISABLED;
}
