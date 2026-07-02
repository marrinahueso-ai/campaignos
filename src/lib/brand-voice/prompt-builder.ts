import type { BrandVoiceContext } from "@/lib/brand-voice/types";
import {
  buildWritingPhilosophySystemRules,
  formatWritingPhilosophyForPrompt,
  resolveEmotionalTarget,
} from "@/lib/brand-voice/writing-philosophy";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { CampaignStageId } from "@/lib/ai-strategy/types";

export const BRAND_VOICE_SYSTEM_RULES = [
  buildWritingPhilosophySystemRules(),
  "Write in the organization's unique brand voice — never generic AI or corporate marketing.",
  "Use preferred vocabulary and avoid disallowed terms.",
  "Match the channel personality for tone, length, and formatting.",
  "Select an opening naturally from the human opening library — avoid corporate AI defaults.",
  "Apply editing memory learnings from prior approved volunteer edits.",
].join(" ");

export function formatBrandVoiceForPrompt(context: BrandVoiceContext): string {
  const { profile, vocabulary, channelPersonality, styleRules, openingOptions, closingOptions, avoidOpenings, editingMemory } =
    context;

  const lines = [
    "=== BRAND VOICE (ORGANIZATION IDENTITY) ===",
    "Write in this organization's voice — not generic AI copy.",
    "",
    "ORGANIZATION VOICE PROFILE",
    `- Personality: ${profile.personality}`,
    `- Reading level: ${profile.readingLevel}`,
    `- Sentence length: ${profile.sentenceLength}`,
    `- Paragraph length: ${profile.paragraphLength}`,
    `- Warmth: ${profile.warmthLevel}`,
    `- Formality: ${profile.formalityLevel}`,
    `- Emoji usage: ${profile.emojiUsage}`,
    `- Punctuation: ${profile.punctuationPreference}`,
    `- Preferred CTA style: ${profile.preferredCtaStyle}`,
    profile.writingStyle ? `- Writing style: ${profile.writingStyle}` : null,
    "",
    "VOCABULARY DICTIONARY",
    `- Preferred terms: ${vocabulary.preferredTerms.join(", ")}`,
    `- Disallowed terms: ${vocabulary.disallowedTerms.join(", ")}`,
    vocabulary.preferredSchoolNames.length > 0
      ? `- School names: ${vocabulary.preferredSchoolNames.join(", ")}`
      : null,
    vocabulary.preferredPtoTerms.length > 0
      ? `- PTO terminology: ${vocabulary.preferredPtoTerms.join(", ")}`
      : null,
    vocabulary.preferredEventNames.length > 0
      ? `- Event names: ${vocabulary.preferredEventNames.join(", ")}`
      : null,
    vocabulary.preferredBrandingLanguage.length > 0
      ? `- Branding language: ${vocabulary.preferredBrandingLanguage.join("; ")}`
      : null,
    "",
    `CHANNEL PERSONALITY: ${channelPersonality.channelLabel}`,
    `- Tone: ${channelPersonality.tone}`,
    `- Target length: ${channelPersonality.targetLength}`,
    `- CTA style: ${channelPersonality.ctaStyle}`,
    ...channelPersonality.formattingGuidance.map((note) => `- Format: ${note}`),
    ...channelPersonality.writingRules.map((rule) => `- ${rule}`),
    "",
    "STYLE RULES",
    ...styleRules.rules.map((rule) => `- ${rule}`),
    "",
    "AVOID",
    ...styleRules.avoidPatterns.map((pattern) => `- ${pattern}`),
    `- Corporate language ban: ${styleRules.corporateLanguageBan.slice(0, 10).join(", ")}`,
    "",
    "OPENING LIBRARY (choose one naturally — do not repeat campaign openings)",
    ...openingOptions.map((option) => `- ${option.label}: ${option.pattern}`),
    avoidOpenings.length > 0
      ? ["", "OPENINGS ALREADY USED IN THIS CAMPAIGN (do not repeat):", ...avoidOpenings.map((o) => `- ${o}`)]
      : null,
    "",
    "CLOSING LIBRARY (choose one naturally)",
    ...closingOptions.map((option) => `- ${option.label}: ${option.pattern}`),
    editingMemory.hasRecords
      ? [
          "",
          "EDITING MEMORY (from approved volunteer edits — apply these preferences)",
          ...editingMemory.channelLearnings.map((learning) => `- ${learning}`),
          ...editingMemory.recentLearnings
            .filter((l) => !editingMemory.channelLearnings.includes(l))
            .slice(0, 3)
            .map((learning) => `- ${learning}`),
        ]
      : null,
  ].filter(Boolean);

  return lines.flat().join("\n");
}

export function buildBrandVoiceSystemPromptAddendum(): string {
  return BRAND_VOICE_SYSTEM_RULES;
}

export function formatWritingPhilosophyBlock(input: {
  eventTitle: string;
  eventTheme: string | null;
  channel: CommunicationChannel;
  stageId: CampaignStageId;
}): string {
  const emotionalTarget = resolveEmotionalTarget(input);
  return formatWritingPhilosophyForPrompt({
    emotionalTarget,
    channel: input.channel,
  });
}
