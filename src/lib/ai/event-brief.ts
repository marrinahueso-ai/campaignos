import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  EVENT_BRIEF_MAX_TOKENS,
  buildEventBriefSystemPrompt,
  buildEventBriefUserPrompt,
  clampBriefToMaxSentences,
  normalizeBriefText,
} from "@/lib/ai/event-brief-prompt";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import type { EventBriefInput, GenerateEventBriefResult } from "@/lib/ai/types";

export {
  buildEventBriefSystemPrompt,
  buildEventBriefUserPrompt,
  clampBriefToMaxSentences,
} from "@/lib/ai/event-brief-prompt";

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
    usage: {
      actionType: "generate_event_brief",
      eventId: input.eventId ?? null,
      organizationId: organization?.id ?? null,
    },
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error ?? "Unable to generate event brief right now.",
      brief: null,
    };
  }

  const brief = clampBriefToMaxSentences(normalizeBriefText(result.text));
  if (!brief) {
    return {
      success: false,
      error: "No brief text was returned. Try again.",
      brief: null,
    };
  }

  return { success: true, error: null, brief };
}
