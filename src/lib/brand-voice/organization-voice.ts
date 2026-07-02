import type { OrganizationVoiceProfile } from "@/lib/brand-voice/types";
import type { Organization } from "@/types";
import type { OrganizationAiProfile } from "@/types/organization-intelligence";

export function buildOrganizationVoiceProfile(input: {
  organization: Organization | null;
  profile: OrganizationAiProfile | null;
}): OrganizationVoiceProfile {
  const { organization, profile } = input;
  const writingStyle = profile?.writingStyle ?? null;

  return {
    organizationName: organization?.name?.trim() || null,
    personality: resolvePersonality(profile),
    readingLevel: resolveReadingLevel(profile),
    sentenceLength: resolveSentenceLength(writingStyle, profile),
    paragraphLength: resolveParagraphLength(profile),
    emojiUsage: profile?.emojiUsage ?? "minimal",
    punctuationPreference: resolvePunctuation(writingStyle),
    preferredCtaStyle: profile?.defaultCtaStyle ?? "soft_invite",
    writingStyle,
    warmthLevel: resolveWarmth(writingStyle, profile),
    formalityLevel: resolveFormality(writingStyle),
    sourceVoiceNotes: profile?.organizationVoice?.trim() || null,
    firstPersonStyle: resolveFirstPersonStyle(profile),
  };
}

function resolvePersonality(profile: OrganizationAiProfile | null): string {
  if (profile?.organizationVoice?.trim()) {
    return profile.organizationVoice.trim();
  }

  switch (profile?.writingStyle) {
    case "warm":
      return "Warm, welcoming, and community-first — like a trusted neighbor on the PTO.";
    case "enthusiastic":
      return "Upbeat and energetic while staying genuine and school-appropriate.";
    case "professional":
      return "Clear and professional with a friendly undertone — never stiff or corporate.";
    case "formal":
      return "Respectful and polished, suitable for school-wide communications.";
    case "concise":
      return "Direct and helpful — every sentence earns its place.";
    default:
      return "Friendly, supportive, and community-first — never generic AI marketing copy.";
  }
}

function resolveReadingLevel(profile: OrganizationAiProfile | null): string {
  if (profile?.audienceDefaults?.trim()) {
    return `Written for: ${profile.audienceDefaults.trim()}`;
  }

  if (profile?.writingStyle === "formal" || profile?.writingStyle === "professional") {
    return "Staff and families — clear, respectful, scannable.";
  }

  return "General school families — plain language, no jargon.";
}

function resolveSentenceLength(
  writingStyle: OrganizationAiProfile["writingStyle"],
  profile: OrganizationAiProfile | null,
): OrganizationVoiceProfile["sentenceLength"] {
  if (writingStyle === "concise") return "short";
  if (profile?.newsletterLength === "long") return "long";
  return "medium";
}

function resolveParagraphLength(
  profile: OrganizationAiProfile | null,
): OrganizationVoiceProfile["paragraphLength"] {
  switch (profile?.newsletterLength) {
    case "short":
      return "short";
    case "long":
      return "long";
    default:
      return "medium";
  }
}

function resolvePunctuation(
  writingStyle: OrganizationAiProfile["writingStyle"],
): OrganizationVoiceProfile["punctuationPreference"] {
  if (writingStyle === "enthusiastic") return "expressive";
  if (writingStyle === "formal" || writingStyle === "professional") return "minimal";
  return "standard";
}

function resolveWarmth(
  writingStyle: OrganizationAiProfile["writingStyle"],
  profile: OrganizationAiProfile | null,
): WarmthLevel {
  if (writingStyle === "warm" || writingStyle === "enthusiastic") return "very_warm";
  if (writingStyle === "formal" || writingStyle === "professional") return "reserved";
  if (profile?.organizationVoice?.toLowerCase().includes("warm")) return "very_warm";
  return "warm";
}

type WarmthLevel = OrganizationVoiceProfile["warmthLevel"];

type FormalityLevel = OrganizationVoiceProfile["formalityLevel"];

function resolveFormality(
  writingStyle: OrganizationAiProfile["writingStyle"],
): FormalityLevel {
  if (writingStyle === "formal") return "formal";
  if (writingStyle === "professional") return "balanced";
  return "casual";
}

function resolveFirstPersonStyle(
  profile: OrganizationAiProfile | null,
): OrganizationVoiceProfile["firstPersonStyle"] {
  const voice = profile?.organizationVoice?.toLowerCase() ?? "";
  if (voice.includes("pto")) return "pto";
  if (voice.includes("school")) return "school";
  if (voice.includes("community")) return "community";
  return "we";
}
