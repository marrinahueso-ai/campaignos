import type { RevisionTag } from "@/components/approvals-revision/types";

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
]);

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
 */
export function deriveAiInstructionsFromNote(noteBody: string): string {
  const text = noteBody.trim();
  if (!text) {
    return "Apply the approver's requested changes to the artwork and caption.";
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

  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function checklistFromTags(
  tags: RevisionTag[],
  scheduleLabel: string | null,
): Array<{
  id: string;
  tag: RevisionTag;
  title: string;
  detail: string;
  done: boolean;
}> {
  const source =
    tags.length > 0 ? tags : (["Artwork", "Date", "Caption"] as RevisionTag[]);

  const details: Record<RevisionTag, string> = {
    Artwork: "Update the creative",
    Date: scheduleLabel || "Adjust publish date if needed",
    Caption: "Optional — match new details",
    Copy: "Update wording",
    Subject: "Email subject line",
    Stories: "Story artwork (9:16) or story blocks",
    Preview: "Check full-page preview",
    Links: "Signup or CTA links",
  };

  return source.map((tag) => ({
    id: tag.toLowerCase(),
    tag,
    title: tag,
    detail: details[tag] ?? "Update this item",
    done: false,
  }));
}
