import type {
  OrganizationFirstPersonStyle,
  OrganizationReadingLevel,
  OrganizationVoice,
  ToneGuidance,
} from "@/lib/ai-strategy/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type {
  EmojiUsage,
  OrganizationAiProfile,
} from "@/types/organization-intelligence";

export function buildOrganizationVoice(
  profile: OrganizationAiProfile | null,
  channel: CommunicationChannel,
): OrganizationVoice {
  return {
    tone: resolveToneSummary(profile, channel),
    readingLevel: resolveReadingLevel(profile),
    emojiUsage: profile?.emojiUsage ?? "minimal",
    firstPersonStyle: resolveFirstPersonStyle(profile),
    preferredBrandWords: extractPreferredBrandWords(profile),
    writingStyle: profile?.writingStyle ?? null,
    channelTone: channelToneFromProfile(profile, channel),
    sourceVoiceNotes: profile?.organizationVoice ?? null,
  };
}

export function resolveToneGuidance(input: {
  organizationVoice: OrganizationVoice;
  channel: CommunicationChannel;
  campaignStageLabel: string;
}): ToneGuidance {
  const voiceNotes = [
    input.organizationVoice.sourceVoiceNotes
      ? `Organization voice: ${input.organizationVoice.sourceVoiceNotes}`
      : `Default tone: ${input.organizationVoice.tone}`,
    input.organizationVoice.writingStyle
      ? `Writing style preference: ${input.organizationVoice.writingStyle}`
      : "Writing style: warm and approachable",
    firstPersonGuidance(input.organizationVoice.firstPersonStyle),
  ];

  if (input.organizationVoice.preferredBrandWords.length > 0) {
    voiceNotes.push(
      `Preferred words/phrases when natural: ${input.organizationVoice.preferredBrandWords.join(", ")}`,
    );
  }

  const channelAdjustments = [
    input.organizationVoice.channelTone
      ? `Channel tone: ${input.organizationVoice.channelTone}`
      : null,
    stageToneAdjustment(input.campaignStageLabel),
    channelToneAdjustment(input.channel),
  ].filter(Boolean) as string[];

  return {
    summary: input.organizationVoice.tone,
    voiceNotes,
    channelAdjustments,
  };
}

export function resolveEmojiPolicy(emojiUsage: EmojiUsage): string {
  switch (emojiUsage) {
    case "none":
      return "Do not use emoji.";
    case "minimal":
      return "Emoji optional — at most one, only if it feels natural for the channel.";
    case "moderate":
      return "Light emoji use is fine (1–2) when it matches the channel.";
    case "frequent":
      return "Emoji welcome where channel-appropriate — stay school-appropriate.";
    default:
      return "Use emoji sparingly and only when channel-appropriate.";
  }
}

function resolveToneSummary(
  profile: OrganizationAiProfile | null,
  channel: CommunicationChannel,
): string {
  const channelTone = channelToneFromProfile(profile, channel);
  if (channelTone) return channelTone;

  switch (profile?.writingStyle) {
    case "professional":
      return "Professional and clear";
    case "enthusiastic":
      return "Enthusiastic and upbeat";
    case "formal":
      return "Formal and respectful";
    case "concise":
      return "Concise and direct";
    case "warm":
      return "Warm and welcoming";
    default:
      return "Friendly and supportive";
  }
}

function channelToneFromProfile(
  profile: OrganizationAiProfile | null,
  channel: CommunicationChannel,
): string | null {
  if (!profile) return null;

  switch (channel) {
    case "facebook":
      return profile.facebookTone;
    case "instagram":
      return profile.instagramTone;
    case "website_announcement":
      return profile.websiteTone;
    case "principal_notes":
    case "morning_announcements":
      return profile.principalMessagingStyle;
    default:
      return profile.communicationPreferences;
  }
}

function resolveReadingLevel(
  profile: OrganizationAiProfile | null,
): OrganizationReadingLevel {
  const style = profile?.writingStyle;
  if (style === "formal" || style === "professional") {
    return "staff_and_families";
  }
  return "general_families";
}

function resolveFirstPersonStyle(
  profile: OrganizationAiProfile | null,
): OrganizationFirstPersonStyle {
  const voice = profile?.organizationVoice?.toLowerCase() ?? "";
  if (voice.includes("pto")) return "pto";
  if (voice.includes("school")) return "school";
  if (voice.includes("community")) return "community";
  return "we";
}

function extractPreferredBrandWords(profile: OrganizationAiProfile | null): string[] {
  if (!profile?.organizationVoice) return [];

  const matches = profile.organizationVoice.match(/["“]([^"”]+)["”]/g);
  if (!matches) return [];

  return matches
    .map((entry) => entry.replace(/["“”]/g, "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function firstPersonGuidance(style: OrganizationFirstPersonStyle): string {
  switch (style) {
    case "pto":
      return "Write from the PTO perspective using we/our.";
    case "school":
      return "Write from the school community perspective when appropriate.";
    case "community":
      return "Use inclusive community language that welcomes all families.";
    default:
      return "Use warm first-person plural (we/our) from the organizing team.";
  }
}

function stageToneAdjustment(stageLabel: string): string {
  return `Campaign stage (${stageLabel}): match urgency to timing — avoid sounding like a final reminder during an announcement.`;
}

function channelToneAdjustment(channel: CommunicationChannel): string {
  switch (channel) {
    case "morning_announcements":
      return "Keep sentences short — this will be read aloud.";
    case "instagram":
      return "Caption energy — tight, visual, and mobile-friendly.";
    case "flyer":
      return "Scannable blocks; headline plus essentials.";
    default:
      return "Stay natural for this channel's typical format.";
  }
}

export type { OrganizationVoice };
