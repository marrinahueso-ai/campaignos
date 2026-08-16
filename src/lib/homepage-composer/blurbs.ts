import { formatEventTimeForInput } from "@/lib/events/time-input";

export type HomepageCardAngle =
  | "info"
  | "spirit"
  | "volunteer"
  | "meeting"
  | "fundraiser"
  | "general";

/**
 * Short visitor-facing blurb from event fields (deterministic seed).
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

  const title = input.title.trim() || "This event";
  const when = formatEventWhen(input.date, input.time);
  return blurbForAngle(inferHomepageCardAngle(title), title, when);
}

/** Default announcement line when picking from the org event calendar. */
export function buildAnnouncementTextFromEvent(input: {
  title: string;
  date: string;
  time: string | null;
}): string {
  const when = formatEventWhen(input.date, input.time);
  if (when) return `${input.title} — ${when}`;
  return input.title.trim() || "Upcoming event";
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
  const displayTime = timeBit ? formatEventTimeForInput(timeBit) : "";
  return displayTime ? `${month} ${day} · ${displayTime}` : `${month} ${day}`;
}

/** Infer how a homepage card should read from its title. */
export function inferHomepageCardAngle(title: string): HomepageCardAngle {
  const t = title.toLowerCase();
  if (
    /\b(early release|early dismissal|minimum day|half[ -]?day|no school|school closed|delayed start|2-hour delay|two-hour delay|dismissal|pick-?up|conference|report card|progress report|picture day|class picture|staff development|teacher work|pd day|inclement|weather day)\b/.test(
      t,
    )
  ) {
    return "info";
  }
  if (
    /\b(spirit|dress(?:-|\s)?up|pajama|twin day|color day|hat day|jersey|pep rally|field day|crazy hair|theme day)\b/.test(
      t,
    )
  ) {
    return "spirit";
  }
  if (
    /\b(volunteer|help needed|sign[- ]up|chaperone|room parent|shift)\b/.test(t)
  ) {
    return "volunteer";
  }
  if (/\b(meeting|board|coffee with|pta meeting|pto meeting)\b/.test(t)) {
    return "meeting";
  }
  if (
    /\b(fundraiser|book fair|auction|jog-?a-?thon|bake sale|booster|donation)\b/.test(
      t,
    )
  ) {
    return "fundraiser";
  }
  return "general";
}

/** True when notes are leftover invitation boilerplate, not useful seed copy. */
export function isWeakInvitationSeed(seed: string, title: string): boolean {
  const s = seed.replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (
    !/^(join us|come join|don't miss|do not miss|we're excited|we are excited)/i.test(
      s,
    )
  ) {
    return false;
  }
  const titleBit = title.trim();
  const withoutTitle = titleBit
    ? s.replace(new RegExp(escapeRegExp(titleBit), "ig"), "")
    : s;
  const leftover = withoutTitle
    .replace(/\d+/g, "")
    .replace(/[—–\-.,!]/g, " ")
    .replace(/\b(join us|for|as we|as|on|at|in|to|details inside)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return leftover.length < 24;
}

export function homepageBlurbOpening(text: string): string {
  return text.trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase();
}

function blurbForAngle(
  angle: HomepageCardAngle,
  title: string,
  when: string,
): string {
  if (angle === "info") {
    return when
      ? `${title} is ${when}. Check details so families are ready.`
      : `${title} is coming up. Check details so families are ready.`;
  }
  if (angle === "spirit") {
    return when
      ? `${title} is ${when}. Wear your colors and show your pride.`
      : `Show your pride for ${title}.`;
  }
  if (angle === "volunteer") {
    return when
      ? `${title} is ${when}. Extra hands make it run smoothly.`
      : `Extra hands make ${title} run smoothly.`;
  }
  if (angle === "meeting") {
    return when ? `${title} is ${when}.` : `${title} is on the calendar.`;
  }
  if (angle === "fundraiser") {
    return when
      ? `${title} is ${when}. Support our school community.`
      : `${title} helps support our school community.`;
  }

  const dated = when
    ? [`${title} — ${when}.`, `${title} is ${when}.`, `Coming up ${when}: ${title}.`]
    : [
        `${title} is on the calendar.`,
        `Learn more about ${title}.`,
        `${title} details are on this card.`,
      ];
  return dated[hashString(title) % dated.length] ?? dated[0];
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
