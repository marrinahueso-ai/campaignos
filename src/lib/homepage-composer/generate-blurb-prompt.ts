import { formatEventWhen } from "@/lib/homepage-composer/blurbs";

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
};

export function buildHomepageBlurbSystemPrompt(): string {
  return [
    "You write short visitor-facing blurbs for organization homepage cards.",
    "Write at most 2 sentences — never more.",
    "Warm, welcoming, and clear. No corporate marketing fluff, no hashtags, no emoji.",
    "Return only the blurb text — no headings, labels, markdown, or preamble.",
  ].join(" ");
}

export function buildHomepageBlurbUserPrompt(
  input: HomepageBlurbContext,
): string {
  const when = formatEventWhen(input.date, input.time);
  const seed = input.seedNotes.trim();
  const lines = [
    seed
      ? "Rewrite the notes below into a short homepage card blurb for your community."
      : "Write a short homepage card blurb for your community from the card context below.",
    "",
    "CARD CONTEXT",
    `- Title: ${input.title.trim() || "(untitled)"}`,
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
    "BLURB REQUIREMENTS",
    "- HARD LIMIT: 1 or 2 sentences total. Stop after the second sentence.",
    "- Visitor-facing homepage copy — invite interest, not a full announcement.",
    "- Do NOT invent dates, times, locations, or logistics not supported above.",
    "- Do NOT open with 'Save the date' or 'Friendly reminder'.",
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
