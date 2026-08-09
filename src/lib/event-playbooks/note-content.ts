/**
 * Event notes store a single `content` text column.
 * UX presents title + optional body; we encode without duplicating:
 * - title only → content = title
 * - title + body → content = `${title}\n\n${body}`
 * Existing multi-line notes: first non-empty line = title, remainder = body.
 */

export function splitNoteContent(content: string): {
  title: string;
  body: string;
} {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const firstIdx = lines.findIndex((line) => line.trim().length > 0);
  if (firstIdx < 0) {
    return { title: "", body: "" };
  }
  const title = lines[firstIdx]!.trim();
  const rest = lines.slice(firstIdx + 1).join("\n").replace(/^\n+/, "").trimEnd();
  return { title, body: rest.trim() };
}

export function composeNoteContent(title: string, body: string): string {
  const t = title.trim();
  const b = body.trim();
  if (!t && !b) return "";
  if (!t) return b;
  if (!b) return t;
  return `${t}\n\n${b}`;
}

export function noteDisplayTitle(content: string): string {
  const { title } = splitNoteContent(content);
  if (!title) return "Untitled note";
  return title.length > 72 ? `${title.slice(0, 72)}…` : title;
}

export function noteAuthorInitials(name: string | null | undefined): string {
  const trimmed = name?.trim() || "Team";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Relative “updated …” label for note cards (uses created_at when no updated_at). */
export function formatNoteUpdatedLabel(iso: string, nowMs = Date.now()): string {
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffMs = Math.max(0, nowMs - then);
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) {
      return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
