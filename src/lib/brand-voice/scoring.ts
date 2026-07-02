import type {
  BrandVoiceContext,
  BrandVoiceScore,
  VocabularyDictionary,
} from "@/lib/brand-voice/types";
import { DISCOURAGED_OPENING_PHRASES } from "@/lib/brand-voice/writing-philosophy";
import type { CommunicationChannel } from "@/types/event-workspace";

export function scoreDraftAgainstBrandVoice(input: {
  draftText: string;
  brandVoice: BrandVoiceContext;
  channel: CommunicationChannel;
}): BrandVoiceScore {
  const { draftText, brandVoice, channel } = input;
  const lower = draftText.toLowerCase();
  const vocabulary = brandVoice.vocabulary;

  const warmth = scoreWarmth(lower, brandVoice);
  const vocabularyScore = scoreVocabulary(lower, vocabulary);
  const channelFit = scoreChannelFit(draftText, brandVoice, channel);
  const clarity = scoreClarity(draftText, brandVoice);
  const communityTone = scoreCommunityTone(lower, vocabulary);

  const dimensions = { warmth, vocabulary: vocabularyScore, channelFit, clarity, communityTone };
  const overall = Math.round(
    (warmth + vocabularyScore + channelFit + clarity + communityTone) / 5,
  );

  const strengths: string[] = [];
  const suggestions: string[] = [];

  if (warmth >= 75) strengths.push("Warm, welcoming tone.");
  else suggestions.push("Add more welcoming, community-first language.");

  if (vocabularyScore >= 75) strengths.push("Good vocabulary alignment.");
  else suggestions.push("Use preferred school/PTO terms and avoid corporate phrasing.");

  if (channelFit >= 75) strengths.push(`Fits ${brandVoice.channelPersonality.channelLabel} format.`);
  else suggestions.push(`Adjust length and tone for ${brandVoice.channelPersonality.channelLabel}.`);

  if (clarity >= 75) strengths.push("Clear and scannable.");
  else suggestions.push("Shorten sentences or paragraphs for readability.");

  const corporateHits = brandVoice.styleRules.corporateLanguageBan.filter((term) =>
    lower.includes(term.toLowerCase()),
  );
  if (corporateHits.length > 0) {
    suggestions.push(`Remove corporate language: ${corporateHits.slice(0, 3).join(", ")}.`);
  }

  const aiOpeningHits = DISCOURAGED_OPENING_PHRASES.filter((phrase) =>
    lower.includes(phrase.toLowerCase()),
  );
  if (aiOpeningHits.length > 0) {
    suggestions.push(
      `Replace AI-default openings with human story-led language: ${aiOpeningHits.slice(0, 2).join(", ")}.`,
    );
  }

  const disallowedHits = vocabulary.disallowedTerms.filter((term) =>
    lower.includes(term.toLowerCase()),
  );
  if (disallowedHits.length > 0) {
    suggestions.push(`Replace disallowed terms: ${disallowedHits.slice(0, 3).join(", ")}.`);
  }

  return {
    overall,
    strengths: strengths.slice(0, 4),
    suggestions: suggestions.slice(0, 5),
    dimensions,
  };
}

function scoreWarmth(lower: string, brandVoice: BrandVoiceContext): number {
  let score = 60;
  const warmWords = ["welcome", "together", "community", "families", "thank", "hope", "join"];
  for (const word of warmWords) {
    if (lower.includes(word)) score += 5;
  }
  if (brandVoice.profile.warmthLevel === "very_warm" && score < 70) score -= 10;
  if (lower.includes("dear valued") || lower.includes("stakeholder")) score -= 20;
  return clamp(score);
}

function scoreVocabulary(lower: string, vocabulary: VocabularyDictionary): number {
  let score = 65;
  for (const term of vocabulary.preferredTerms) {
    if (lower.includes(term.toLowerCase())) score += 4;
  }
  for (const term of vocabulary.disallowedTerms) {
    if (lower.includes(term.toLowerCase())) score -= 15;
  }
  for (const name of vocabulary.preferredSchoolNames) {
    if (lower.includes(name.toLowerCase())) score += 5;
  }
  return clamp(score);
}

function scoreChannelFit(
  draft: string,
  brandVoice: BrandVoiceContext,
  channel: CommunicationChannel,
): number {
  let score = 70;
  const wordCount = draft.split(/\s+/).length;
  const limits = CHANNEL_WORD_LIMITS[channel] ?? { min: 20, max: 200 };

  if (wordCount >= limits.min && wordCount <= limits.max) score += 15;
  else if (wordCount > limits.max * 1.5) score -= 15;
  else if (wordCount < limits.min * 0.5) score -= 10;

  if (channel === "morning_announcements" && draft.split(/[.!?]/).length > 4) {
    score -= 15;
  }

  if (brandVoice.profile.emojiUsage === "none" && /[\u{1F300}-\u{1FAFF}]/u.test(draft)) {
    score -= 20;
  }

  return clamp(score);
}

function scoreClarity(draft: string, brandVoice: BrandVoiceContext): number {
  let score = 75;
  const sentences = draft.split(/[.!?]+/).filter(Boolean);
  const avgWords =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
      : 0;

  if (brandVoice.profile.sentenceLength === "short" && avgWords > 22) score -= 15;
  if (avgWords > 35) score -= 20;
  if (avgWords >= 8 && avgWords <= 20) score += 10;

  return clamp(score);
}

function scoreCommunityTone(lower: string, vocabulary: VocabularyDictionary): number {
  let score = 65;
  if (lower.includes("families") || lower.includes("community")) score += 15;
  if (vocabulary.preferredPtoTerms.some((term) => lower.includes(term.toLowerCase()))) {
    score += 10;
  }
  if (lower.includes("we ") || lower.includes("our ")) score += 5;
  if (lower.includes("buy now") || lower.includes("act now")) score -= 25;
  return clamp(score);
}

const CHANNEL_WORD_LIMITS: Partial<
  Record<CommunicationChannel, { min: number; max: number }>
> = {
  morning_announcements: { min: 15, max: 60 },
  instagram: { min: 15, max: 80 },
  facebook: { min: 20, max: 120 },
  email: { min: 40, max: 250 },
  newsletter: { min: 60, max: 350 },
  website_announcement: { min: 50, max: 300 },
  principal_notes: { min: 30, max: 150 },
  volunteer_signup: { min: 30, max: 180 },
  flyer: { min: 25, max: 120 },
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
