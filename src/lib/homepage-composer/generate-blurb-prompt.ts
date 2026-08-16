import {
  formatEventWhen,
  homepageBlurbOpening,
  inferHomepageCardAngle,
  isWeakInvitationSeed,
  type HomepageCardAngle,
} from "@/lib/homepage-composer/blurbs";

export const HOMEPAGE_BLURB_MAX_TOKENS = 120;
export const HOMEPAGE_BLURB_MAX_SENTENCES = 2;

export type HomepageBlurbContext = {
  title: string;
  /** Current description / notes — used as seed when present. */
  seedNotes: string;
  date: string | null;
  time: string | null;
  startsOn: string | null;
  expiresOn: string | null;
  alwaysOn: boolean;
  linkUrl: string | null;
  organizationName: string | null;
  brandVoiceSummary: string;
  /** Other cards on this homepage — avoid repeating their openings. */
  siblingBlurbs?: string[];
  /** Changes on regenerate so the model does not reuse the same lead. */
  varietyNonce?: number;
};

const ANGLE_LEAD: Record<HomepageCardAngle, string> = {
  info: "Lead with the practical fact families need (what changed, when, or what to do). Do not frame a schedule change as a party or invitation.",
  spirit: "Lead with the theme, what to wear, or the day of the week — celebratory, not a generic invite.",
  volunteer: "Lead with the specific help needed or how to pitch in.",
  meeting: "Lead with who it is for, the topic, or when it happens — not a generic invitation.",
  fundraiser: "Lead with what this supports or what families can do.",
  general:
    "Lead with a concrete detail (date, what happens, who it is for, or a benefit).",
};

const GENERAL_LEAD_HINTS = [
  "Open with the date or timing first.",
  "Open with what happens, not an invitation.",
  "Open with who it is for or why it matters to families.",
  "Open with a concrete detail from the title.",
];

const STALE_OPENER =
  /^(?:Join us(?:\s+(?:for|as we|as|at|in|to))?|Come join(?:\s+us)?(?:\s+for)?|Don(?:'t|’t) miss|Do not miss|We(?:'re| are) excited to invite you to)\s+/i;

export function buildHomepageBlurbSystemPrompt(): string {
  return [
    "You write short visitor-facing blurbs for organization homepage cards.",
    "Write at most 2 sentences — never more.",
    "Warm, specific, and clear. No corporate marketing fluff, no hashtags, no emoji.",
    "Vary the opening every time. Never start with Join us, Come join, Don't miss, or We're excited to invite.",
    "Match the card: schedule notices are practical; spirit days are about the theme; volunteer cards ask for help.",
    "Return only the blurb text — no headings, labels, markdown, or preamble.",
  ].join(" ");
}

export function buildHomepageBlurbUserPrompt(
  input: HomepageBlurbContext,
): string {
  const when = formatEventWhen(input.date, input.time);
  const rawSeed = input.seedNotes.trim();
  const weakSeed = isWeakInvitationSeed(rawSeed, input.title);
  const seed = weakSeed ? "" : rawSeed;
  const angle = inferHomepageCardAngle(input.title);
  const leadHint = pickLeadHint(input.title, input.varietyNonce ?? 0, angle);
  const siblingLines = siblingOpeningLines(input.siblingBlurbs ?? []);
  const lines = [
    seed
      ? "Rewrite the notes below into a short homepage card blurb for your community. Keep useful facts; drop leftover invitation phrasing."
      : "Write a short homepage card blurb for your community from the card context below.",
    "",
    "CARD CONTEXT",
    `- Title: ${input.title.trim() || "(untitled)"}`,
    `- Card angle: ${angle}`,
    `- How to open: ${leadHint}`,
    when ? `- Event when: ${when}` : null,
    input.alwaysOn ? "- Visibility: always on (evergreen)" : null,
    !input.alwaysOn && input.startsOn
      ? `- Shows from: ${input.startsOn}`
      : null,
    !input.alwaysOn && input.expiresOn
      ? `- Shows through: ${input.expiresOn}`
      : null,
    input.linkUrl?.trim() ? "- Link present: yes" : null,
    "",
    "ORGANIZATION BRAND VOICE",
    input.organizationName
      ? `- Organization: ${input.organizationName}`
      : "- Organization: (not provided)",
    `- Voice guidance: ${input.brandVoiceSummary}`,
    "",
    "NOTES / SEED",
    seed || "(none — infer from title and context only)",
    "",
    siblingLines.length
      ? ["OTHER CARDS ON THIS HOMEPAGE — do not reuse their openings:", ...siblingLines, ""].join(
          "\n",
        )
      : null,
    "BLURB REQUIREMENTS",
    "- HARD LIMIT: 1 or 2 sentences total. Stop after the second sentence.",
    "- Visitor-facing homepage copy — specific to this card, not a full announcement.",
    "- Do NOT invent dates, times, locations, or logistics not supported above.",
    "- Do NOT open with 'Join us', 'Come join', 'Don't miss', 'Save the date', or 'Friendly reminder'.",
    "- If this card is a schedule notice (early release, no school, dismissal), be practical — never invitational.",
    "- Keep it under ~160 characters when possible.",
  ].filter((line) => line !== null);

  return lines.join("\n");
}

export function normalizeHomepageBlurbText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:markdown|text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/^(blurb|description):\s*/i, "")
    .trim();
}

/** Keep at most N sentences when the model overshoots. */
export function clampBlurbToMaxSentences(
  text: string,
  maxSentences = HOMEPAGE_BLURB_MAX_SENTENCES,
): string {
  const trimmed = text.trim();
  if (!trimmed || maxSentences < 1) {
    return trimmed;
  }

  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts || parts.length <= maxSentences) {
    return trimmed;
  }

  return parts
    .slice(0, maxSentences)
    .map((part) => part.trim())
    .join(" ")
    .trim();
}

/** Last-resort rewrite if the model still leads with invitation boilerplate. */
export function stripStaleHomepageBlurbOpener(text: string): string {
  const trimmed = text.trim();
  const next = trimmed.replace(STALE_OPENER, "");
  if (next === trimmed || !next) return trimmed;
  return next.charAt(0).toUpperCase() + next.slice(1);
}

function pickLeadHint(
  title: string,
  nonce: number,
  angle: HomepageCardAngle,
): string {
  if (angle !== "general") return ANGLE_LEAD[angle];
  const idx =
    Math.abs(hashString(title) + nonce) % GENERAL_LEAD_HINTS.length;
  return `${ANGLE_LEAD.general} ${GENERAL_LEAD_HINTS[idx]}`;
}

function siblingOpeningLines(siblingBlurbs: string[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const blurb of siblingBlurbs) {
    const opening = homepageBlurbOpening(blurb);
    if (!opening || seen.has(opening)) continue;
    seen.add(opening);
    lines.push(`- "${opening}…"`);
    if (lines.length >= 8) break;
  }
  return lines;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
