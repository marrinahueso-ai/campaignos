import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  buildCreativeBriefFromContext,
  mergeCreativeBrief,
} from "@/lib/creative-director/build-brief";
import type { CreativeBrief, CreativeDirectorContext } from "@/lib/creative-director/types";

const BRIEF_MAX_TOKENS = 900;

function buildBriefEnhancementPrompt(context: CreativeDirectorContext): string {
  const { event, brandColors, organizationVoice, styleMemory } = context;
  const priorCampaigns = styleMemory
    .slice(0, 3)
    .map((entry) => `- ${entry.eventTitle}: ${entry.style.style}`)
    .join("\n");

  return [
    "Enhance this campaign creative brief as JSON only — no markdown.",
    "Use ONLY facts from the context below. Do not invent dates, activities, or logistics.",
    "",
    "EVENT",
    `- Title: ${event.title}`,
    event.theme ? `- Theme: ${event.theme}` : null,
    event.category ? `- Category: ${event.category}` : null,
    event.audience ? `- Audience: ${event.audience}` : null,
    event.description.trim()
      ? `- Event brief: ${event.description.trim()}`
      : "- Event brief: (not provided)",
    "",
    "BRAND",
    brandColors.length > 0
      ? `- School colors: ${brandColors.join(", ")}`
      : "- School colors: (not on file)",
    organizationVoice
      ? `- Brand voice: ${organizationVoice}`
      : "- Brand voice: (not on file)",
    priorCampaigns ? `\nPRIOR APPROVED STYLES\n${priorCampaigns}` : null,
    "",
    "Return JSON with keys:",
    "personality (string[]), emotionalTone (string[]), visualDirection (string),",
    "typographySuggestions (string), illustrationVsPhotography (illustrated|photography|mixed|none),",
    "colorPalette (string[]), iconRecommendations (string[]), graphicStyle (string),",
    "textureBackgroundSuggestions (string), consistencyRules (string[]), doNotUse (string[]), moodSummary (string)",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseBriefJson(raw: string): Partial<CreativeBrief> | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(cleaned) as Partial<CreativeBrief>;
  } catch {
    return null;
  }
}

export async function generateEnhancedCreativeBrief(
  context: CreativeDirectorContext,
): Promise<{ brief: CreativeBrief; isAiEnhanced: boolean }> {
  const baseline = buildCreativeBriefFromContext(context);

  if (!isAiConfigured()) {
    return { brief: baseline, isAiEnhanced: false };
  }

  const model = resolveFastDraftModel();
  const result = await generateText({
    model,
    systemPrompt:
      "You are a creative director for school PTO campaigns. Return valid JSON only. Never invent event facts.",
    userPrompt: buildBriefEnhancementPrompt(context),
    maxTokens: BRIEF_MAX_TOKENS,
    temperature: 0.6,
  });

  await logAiUsage({
    eventId: context.event.id,
    actionType: "generate_creative_brief",
    channel: null,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens,
    success: result.success,
    errorMessage: result.error,
  });

  if (!result.success || !result.text) {
    return { brief: baseline, isAiEnhanced: false };
  }

  const patch = parseBriefJson(result.text);
  if (!patch) {
    return { brief: baseline, isAiEnhanced: false };
  }

  return {
    brief: mergeCreativeBrief(baseline, { ...patch, campaignTitle: context.event.title }),
    isAiEnhanced: true,
  };
}
