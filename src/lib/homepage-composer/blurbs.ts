/**
 * Short parent-facing blurb from event fields (deterministic seed).
 * Card editor can rewrite via `generateHomepageComposerBlurbAction`.
 */
export function buildEventBlurb(input: {
  title: string;
  description: string;
  date: string;
  time: string | null;
}): string {
  const cleaned = (input.description || "")
    .replace(/\s+/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (cleaned.length >= 40) {
    const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
    if (sentence.length <= 160) return sentence;
    return `${sentence.slice(0, 157).trim()}…`;
  }

  const when = formatEventWhen(input.date, input.time);
  if (when) {
    return `Join us for ${input.title} — ${when}.`;
  }
  return `Join us for ${input.title}. Details for Explorer families inside.`;
}

export function formatEventWhen(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  if (!date) return "";
  const parts = date.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return time?.trim() || date;
  }
  const [y, m, d] = parts as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const month = dt.toLocaleString("en-US", { month: "short" });
  const day = dt.getDate();
  const timeBit = time?.trim();
  return timeBit ? `${month} ${day} · ${timeBit}` : `${month} ${day}`;
}
