import type { FlyerComposerGeneratedSlots } from "@/lib/flyer-composer/types";

export function looksLikeCalendarLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i.test(t) ||
    /^\d{1,2}[/-]\d{1,2}/.test(t) ||
    /[—–\-:|]/.test(t) ||
    /\b(break|orientation|concert|fair|night|festival|holiday|early release|no school)\b/i.test(
      t,
    )
  );
}

export function splitCalendarLines(text: string): string[] {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Semester preview reads month rows from datesEvents — recover when AI mis-slots calendar lines. */
export function coalesceSemesterCalendarSlots<
  T extends Pick<FlyerComposerGeneratedSlots, "datesEvents" | "bodyCopy">,
>(templateId: string, slots: T): T {
  if (templateId !== "semester") return slots;

  const dates = slots.datesEvents?.trim();
  if (dates) return slots;

  const body = slots.bodyCopy?.trim();
  if (!body) return slots;

  const bodyLines = splitCalendarLines(body);
  const calendarLines = bodyLines.filter(looksLikeCalendarLine);
  if (!calendarLines.length) return slots;

  const remainder = bodyLines.filter((line) => !calendarLines.includes(line));
  return {
    ...slots,
    datesEvents: calendarLines.join("\n"),
    bodyCopy: remainder.join("\n"),
  };
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders Semester at a Glance month-list rows for preview HTML. */
export function formatSemesterMonthListHtml(datesEvents: string): string {
  const lines = splitCalendarLines(datesEvents);
  if (!lines.length) {
    return `<div><span class="m">—</span><span>Add dates in Inspiration</span></div>`;
  }
  return lines
    .map((line) => {
      const sep = line.match(/\s*(—|–|-|:|\|)\s+/);
      if (sep && sep.index != null && sep.index > 0) {
        const month = line.slice(0, sep.index).trim();
        const rest = line.slice(sep.index + sep[0].length).trim();
        return `<div><span class="m">${escapeHtml(month)}</span><span>${escapeHtml(rest)}</span></div>`;
      }
      return `<div><span class="m">•</span><span>${escapeHtml(line)}</span></div>`;
    })
    .join("");
}
