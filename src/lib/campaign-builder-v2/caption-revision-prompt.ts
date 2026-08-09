/**
 * Pure helpers for caption regenerate / Instruct AI direction framing.
 * Kept free of @/ imports so node --test can load them directly.
 */

/** Normalize direction text for duplicate detection. */
export function normalizeCaptionDirectionText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");
}

/**
 * True when regenerate instructions match milestone captionNotes.
 * Ignores a trailing "Tone: …" suffix appended by regenerateCaptionAction.
 */
export function isDuplicateCaptionDirection(
  captionNotes: string,
  revisionInstructions: string,
): boolean {
  const notes = normalizeCaptionDirectionText(captionNotes);
  if (!notes) {
    return false;
  }

  let revision = normalizeCaptionDirectionText(revisionInstructions);
  revision = revision.replace(/\.?\s*tone:\s*.+$/i, "").trim();
  return Boolean(revision) && notes === revision;
}

/**
 * Frame Edit Post / Approvals regenerate notes as non-literal revision direction.
 */
export function buildCaptionRevisionGuide(input: {
  revisionInstructions: string;
  existingCaption?: string | null;
}): string {
  const notes = input.revisionInstructions.trim();
  const draft = input.existingCaption?.trim() ?? "";

  const directionBlock = [
    "User revision direction:",
    notes,
    "",
    "Interpret the intent of these instructions and revise the caption accordingly.",
    "Do not quote, repeat, mention, or paste these instructions into the caption.",
    "Do not refer to the editing request itself.",
    "Return only the revised caption content.",
  ].join("\n");

  if (!draft) {
    return directionBlock;
  }

  return [
    "",
    "Revise the draft below per the user's revision direction.",
    "Improve clarity and tone — do not preserve invented logistics, hashtags, or wording the user did not intend.",
    directionBlock,
    `Draft to revise:\n"${draft}"`,
  ].join("\n");
}
