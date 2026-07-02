import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { EventBriefInput, GenerateEventBriefResult } from "@/lib/ai/types";

const EVENT_BRIEF_MAX_TOKENS = 350;

export function buildEventBriefSystemPrompt(): string {
  return [
    "You write internal event briefs for school PTO communications teams.",
    "This is NOT a parent-facing announcement, email, or social post.",
    "Write 3–5 sentences maximum — clear, warm, and useful as a source of truth for future drafts.",
    "Answer implicitly: what is this event, why it matters, what families should feel, what communications should emphasize, and what must not be invented.",
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
    "- 3–5 sentences only.",
    "- Internal planning tone — for communicators, not families reading a final message.",
    "- State what communications should emphasize and the feeling to aim for.",
    briefInput.volunteerNeeds?.trim()
      ? "- Volunteer needs are confirmed — mention them as part of what communications may emphasize."
      : "- Do NOT mention volunteer needs unless they appear in confirmed volunteer needs above.",
    "- Do NOT invent dates, times, locations, activities, or logistics not supported by the context above.",
    "- Do NOT write opening lines like 'Save the date' or 'Friendly reminder'.",
  ].filter(Boolean);

  return lines.join("\n");
}

function normalizeBriefText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:markdown|text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function generateEventBrief(input: {
  eventId?: string | null;
  briefInput: EventBriefInput;
}): Promise<GenerateEventBriefResult> {
  if (!isAiConfigured()) {
    return {
      success: false,
      error: "AI brief generation isn't set up yet.",
      brief: null,
    };
  }

  if (!input.briefInput.title.trim() && !input.briefInput.roughDescription.trim()) {
    return {
      success: false,
      error: "Add an event name or rough notes before generating a brief.",
      brief: null,
    };
  }

  const organization = await getLatestOrganization();
  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;
  const voiceProfile = buildOrganizationVoiceProfile({ organization, profile });
  const brandVoiceSummary = [
    voiceProfile.personality,
    voiceProfile.sourceVoiceNotes,
    voiceProfile.writingStyle ? `Writing style: ${voiceProfile.writingStyle}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const model = resolveFastDraftModel();
  const result = await generateText({
    model,
    systemPrompt: buildEventBriefSystemPrompt(),
    userPrompt: buildEventBriefUserPrompt({
      briefInput: input.briefInput,
      organizationName: organization?.name ?? null,
      brandVoiceSummary: brandVoiceSummary || "Warm, welcoming, community-first PTO voice.",
    }),
    maxTokens: EVENT_BRIEF_MAX_TOKENS,
    temperature: 0.7,
  });

  await logAiUsage({
    eventId: input.eventId ?? null,
    actionType: "generate_event_brief",
    channel: null,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens,
    success: result.success,
    errorMessage: result.error,
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error ?? "Unable to generate event brief right now.",
      brief: null,
    };
  }

  const brief = normalizeBriefText(result.text);
  if (!brief) {
    return {
      success: false,
      error: "No brief text was returned. Try again.",
      brief: null,
    };
  }

  return { success: true, error: null, brief };
}
