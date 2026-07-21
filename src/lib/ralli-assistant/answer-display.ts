/**
 * Display helpers for Ask Ralli answers — strip raw markdown links when
 * destinations already appear as chips, keep prose scannable.
 */

/** Convert `[Label](url)` / `[Label](/path)` to plain `Label`. */
export function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

/**
 * Soft cleanup when link chips are present: strip markdown links and
 * drop redundant “Quick links:” / bare path leftovers that clutter the body.
 */
export function prepareAnswerForDisplay(
  text: string,
  options?: { hasLinkChips?: boolean },
): string {
  let next = text.replace(/\r\n/g, "\n").trim();
  if (!next) return next;

  if (options?.hasLinkChips !== false) {
    next = stripMarkdownLinks(next);
    // Remove a trailing "Quick links:" block (FAQ used to inline these).
    next = next.replace(/\n*Quick links:\s*\n(?:[•*-]\s*.+\n?)+$/i, "");
    // Collapse leftover empty lines from stripping.
    next = next.replace(/\n{3,}/g, "\n\n").trim();
  }

  return next;
}

/** Format YYYY-MM-DD (or parseable ISO) as "Aug 5, 2026". */
export function formatEventDateLabel(date: string): string {
  const raw = date.trim();
  if (!raw) return date;

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let parsed: Date;
  if (dateOnly) {
    parsed = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  } else {
    parsed = new Date(raw);
  }

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventChipLabel(title: string, date: string): string {
  const formatted = formatEventDateLabel(date);
  return formatted ? `${title} · ${formatted}` : title;
}
