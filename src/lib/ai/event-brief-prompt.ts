import type { EventBriefInput } from "@/lib/ai/types";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";

export const EVENT_BRIEF_MAX_TOKENS = 160;
export const EVENT_BRIEF_MAX_SENTENCES = 3;

export function buildEventBriefSystemPrompt(): string {
  return [
    "You write internal event briefs for school PTO communications teams.",
    "This is NOT a parent-facing announcement, email, or social post.",
    "Write exactly 2 or 3 short sentences — never more.",
    "Cover only: what the event is, why it matters, and what communications should emphasize.",
    "Use the organization's brand voice — welcoming and genuine, never corporate or generic AI marketing.",
    "Return only the brief text — no headings, labels, markdown, or preamble.",
  ].join(" ");
}

export function buildEventBriefUserPrompt(input: {
  briefInput: EventBriefInput;
  organizationName: string | null;
  brandVoiceSummary: string;
}): string {
  const { briefInput } = input;
  const lines = [
    "Turn the rough notes below into a polished internal event brief.",
    "",
    "EVENT CONTEXT",
    `- Title: ${briefInput.title.trim() || "(untitled)"}`,
    briefInput.date
      ? `- Date: ${formatEventDate(briefInput.date)}`
      : "- Date: (not provided)",
    briefInput.time
      ? `- Start time: ${formatEventTime(briefInput.time) ?? briefInput.time}`
      : null,
    briefInput.location?.trim()
      ? `- Location: ${briefInput.location.trim()}`
      : "- Location: (not provided)",
    briefInput.audience?.trim()
      ? `- Audience: ${briefInput.audience.trim()}`
      : "- Audience: (not provided)",
    briefInput.theme?.trim() ? `- Theme: ${briefInput.theme.trim()}` : null,
    briefInput.category?.trim()
      ? `- Category: ${briefInput.category.trim()}`
      : null,
    briefInput.eventTypeLabel?.trim()
      ? `- Event type: ${briefInput.eventTypeLabel.trim()}`
      : null,
    briefInput.communicationStrategyLabel?.trim()
      ? `- Communication plan: ${briefInput.communicationStrategyLabel.trim()}`
      : null,
    briefInput.volunteerNeeds?.trim()
      ? `- Confirmed volunteer needs: ${briefInput.volunteerNeeds.trim()}`
      : "- Confirmed volunteer needs: none on file",
    "",
    "ORGANIZATION BRAND VOICE",
    input.organizationName
      ? `- School / organization: ${input.organizationName}`
      : "- School / organization: (not provided)",
    `- Voice guidance: ${input.brandVoiceSummary}`,
    "",
    "ROUGH NOTES",
    briefInput.roughDescription.trim() || "(none — infer from title and context only)",
    "",
    "BRIEF REQUIREMENTS",
    "- HARD LIMIT: 2 or 3 sentences total. Stop after the third sentence.",
    "- Keep each sentence short. No filler, no marketing fluff.",
    "- Internal planning tone — for communicators, not families reading a final message.",
    briefInput.volunteerNeeds?.trim()
      ? "- Volunteer needs are confirmed — you may mention them briefly."
      : "- Do NOT mention volunteer needs unless they appear in confirmed volunteer needs above.",
    "- Do NOT invent dates, times, locations, activities, or logistics not supported by the context above.",
    "- Do NOT write opening lines like 'Save the date' or 'Friendly reminder'.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function normalizeBriefText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:markdown|text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/** Keep at most N sentences when the model overshoots. */
export function clampBriefToMaxSentences(
  text: string,
  maxSentences = EVENT_BRIEF_MAX_SENTENCES,
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
