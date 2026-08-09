import type { RevisionTag } from "../../components/approvals-revision/types.ts";

const TAG_PREFIX = "@@hr-rev:";
const TAG_SUFFIX = "@@";

const KNOWN_TAGS = new Set<string>([
  "Artwork",
  "Date",
  "Caption",
  "Copy",
  "Subject",
  "Stories",
  "Preview",
  "Links",
  "QR",
  "Layout",
]);

/** Approver tag chips for Social change requests. */
export const SOCIAL_REVISION_TAGS: RevisionTag[] = [
  "Artwork",
  "Stories",
  "Date",
  "Caption",
  "Copy",
];

/** Approver tag chips for print Flyer change requests. */
export const FLYER_REVISION_TAGS: RevisionTag[] = [
  "Artwork",
  "Date",
  "Copy",
  "QR",
  "Layout",
];

export function encodeRevisionNotes(
  comment: string,
  tags: RevisionTag[],
): string {
  const body = comment.trim();
  const cleanTags = tags.filter((t) => KNOWN_TAGS.has(t));
  if (cleanTags.length === 0) {
    return body;
  }
  return `${TAG_PREFIX}${cleanTags.join(",")}${TAG_SUFFIX}\n${body}`;
}

export function parseRevisionNotes(raw: string | null | undefined): {
  comment: string;
  tags: RevisionTag[];
} {
  const text = (raw ?? "").trim();
  if (!text.startsWith(TAG_PREFIX)) {
    return { comment: text, tags: [] };
  }
  const end = text.indexOf(TAG_SUFFIX, TAG_PREFIX.length);
  if (end < 0) {
    return { comment: text, tags: [] };
  }
  const tagPart = text.slice(TAG_PREFIX.length, end);
  const tags = tagPart
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is RevisionTag => KNOWN_TAGS.has(t));
  const comment = text.slice(end + TAG_SUFFIX.length).replace(/^\n/, "").trim();
  return { comment, tags };
}

/**
 * Turn approver change-request prose into imperative AI instructions.
 * Prefills the Revision "Instruct AI" box; "Use note as-is" resets here.
 * Output is revision direction for the model — not candidate caption copy.
 */
export function deriveAiInstructionsFromNote(noteBody: string): string {
  const text = noteBody.trim();
  if (!text) {
    return "Apply the approver's requested changes as revision direction. Do not paste their note into the caption.";
  }

  // Already framed (e.g. user edited after a prior derive) — keep as-is.
  if (
    /^revision direction\b/i.test(text) ||
    /\bdo not paste\b/i.test(text)
  ) {
    return text;
  }

  let out = text
    .replace(/^(can|could)\s+we\s+/i, "")
    .replace(/^please\s+/i, "")
    .replace(/\?/g, ".")
    .replace(/\.+/g, ".")
    .trim();

  if (!out.endsWith(".")) {
    out = `${out}.`;
  }

  out = out.charAt(0).toUpperCase() + out.slice(1);

  return `Revision direction (interpret intent; do not paste into the caption): ${out}`;
}

export function checklistFromTags(
  tags: RevisionTag[],
  scheduleLabel: string | null,
  options?: { isFlyer?: boolean },
): Array<{
  id: string;
  tag: RevisionTag;
  title: string;
  detail: string;
  done: boolean;
}> {
  const isFlyer = Boolean(options?.isFlyer);
  const source =
    tags.length > 0
      ? tags
      : isFlyer
        ? (["Artwork", "Date", "Copy"] as RevisionTag[])
        : (["Artwork", "Date", "Caption"] as RevisionTag[]);

  const details: Record<RevisionTag, string> = {
    Artwork: "Update the creative",
    Date:
      scheduleLabel ||
      (isFlyer ? "Adjust event date if needed" : "Adjust publish date if needed"),
    Caption: "Optional — match new details",
    Copy: "Update wording",
    Subject: "Email subject line",
    Stories: "Story artwork (9:16) or story blocks",
    Preview: "Check full-page preview",
    Links: "Signup or CTA links",
    QR: "QR code or signup link on the flyer",
    Layout: "Spacing, hierarchy, or print crop",
  };

  return source.map((tag) => ({
    id: tag.toLowerCase(),
    tag,
    title: tag,
    detail: details[tag] ?? "Update this item",
    done: false,
  }));
}
