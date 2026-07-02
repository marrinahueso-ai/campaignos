import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import type { ChannelPersonality, OrganizationVoiceProfile } from "@/lib/brand-voice/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { OrganizationAiProfile } from "@/types/organization-intelligence";

function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

export function resolveChannelPersonality(input: {
  channel: CommunicationChannel;
  profile: OrganizationVoiceProfile;
  aiProfile: OrganizationAiProfile | null;
}): ChannelPersonality {
  const { channel, profile, aiProfile } = input;
  const base = CHANNEL_PERSONALITIES[channel] ?? DEFAULT_PERSONALITY;
  const channelTone = channelToneOverride(channel, aiProfile);

  return {
    channel,
    channelLabel: channelLabel(channel),
    tone: channelTone ?? base.tone,
    targetLength: base.targetLength,
    ctaStyle: resolveChannelCtaStyle(profile.preferredCtaStyle, base.ctaStyle),
    formattingGuidance: base.formattingGuidance,
    writingRules: [
      ...base.writingRules,
      emojiRuleForChannel(channel, profile.emojiUsage),
      warmthRule(profile.warmthLevel),
    ],
  };
}

const DEFAULT_PERSONALITY: Omit<ChannelPersonality, "channel" | "channelLabel"> = {
  tone: "Warm, human, community-first",
  targetLength: "Concise — short paragraphs, easy mobile reading.",
  ctaStyle: "Soft invite woven into the story — welcoming, not pushy.",
  formattingGuidance: [
    "Short paragraphs and natural breaks.",
    "Paint the moment before logistics.",
  ],
  writingRules: [
    "Sound like a real PTO parent — not AI or corporate marketing.",
    "Emotion → community → story → facts → logistics.",
  ],
};

const CHANNEL_PERSONALITIES: Partial<
  Record<
    CommunicationChannel,
    Omit<ChannelPersonality, "channel" | "channelLabel">
  >
> = {
  newsletter: {
    tone: "Story first, details second — like a PTO parent writing the school bulletin.",
    targetLength: "Medium — 2–4 short paragraphs; one emotional hook, then verified details.",
    ctaStyle: "Gentle invitation woven into the story — not a marketing CTA.",
    formattingGuidance: [
      "Open with the feeling or moment — not the calendar date.",
      "Short paragraphs with natural breaks; bullets OK for logistics.",
    ],
    writingRules: [
      "Story before schedule — families read for connection, not announcements.",
      "Sign off warmly from the PTO like a neighbor, not an institution.",
    ],
  },
  website_announcement: {
    tone: "Informative and welcoming — scannable, human, not bureaucratic.",
    targetLength: "2–4 short paragraphs with whitespace.",
    ctaStyle: "Clear next step after the reader understands why it matters.",
    formattingGuidance: [
      "Lead with why families should care, then verified when/where.",
      "Short paragraphs and line breaks for mobile scanning.",
    ],
    writingRules: [
      "Family-friendly and accessible — never read like district boilerplate.",
      "Warmth over hype — helpful and inviting.",
    ],
  },
  facebook: {
    tone: "Warm, conversational, community — like posting to school parents you know.",
    targetLength: "Short — 2–4 sentences, optional light emoji.",
    ctaStyle: "Natural community ask — comments, shares, or showing up together.",
    formattingGuidance: [
      "Hook with feeling or a vivid moment — not 'Friendly reminder'.",
      "Whitespace and short lines; easy thumb-scrolling.",
    ],
    writingRules: [
      "Write like a real parent volunteer, not a brand page.",
      "Encourage community interaction without corporate CTAs.",
    ],
  },
  instagram: {
    tone: "Fun, energetic, visual — minimal words, maximum feeling.",
    targetLength: "Brief — 1–3 sentences plus hashtags at the end.",
    ctaStyle: "Light energy — link in bio or show-up vibe, not hard sell.",
    formattingGuidance: [
      "Front-load the vibe, not the logistics.",
      "Hashtags only at the end, 3–5 max.",
    ],
    writingRules: [
      "Tight and punchy — every word earns its place.",
      "Match the visual energy; don't describe pixels generically.",
    ],
  },
  morning_announcements: {
    tone: "Short, energetic, natural read-aloud — sounds good over a PA.",
    targetLength: "Very short — 2–3 sentences total.",
    ctaStyle: "Simple nudge to tell families at home.",
    formattingGuidance: ["No complex clauses.", "Easy for students to hear and repeat."],
    writingRules: [
      "Sound natural when spoken — like a person, not a memo.",
      "Energy first, logistics second.",
    ],
  },
  principal_notes: {
    tone: "Brief staff-facing talking points — professional but warm.",
    targetLength: "3–5 bullet-friendly sentences.",
    ctaStyle: "Ask staff to mention the event appropriately.",
    formattingGuidance: ["Talking points, not a full script.", "Scannable list OK."],
    writingRules: [
      "Respect staff time — be concise.",
      "Align with school communication norms.",
    ],
  },
  email: {
    tone: "Personal note from a trusted school contact.",
    targetLength: "Friendly email — greeting, 2–3 paragraphs, warm sign-off.",
    ctaStyle: "Reply-friendly or clear next step.",
    formattingGuidance: [
      "Include a greeting and sign-off.",
      "One main idea per paragraph.",
    ],
    writingRules: [
      "Feel like a note, not a blast.",
      "Warm but not overly formal.",
    ],
  },
  volunteer_signup: {
    tone: "Purpose-driven — explain impact on kids and teachers before asking.",
    targetLength: "Short — why it matters, then verified roles only if on file.",
    ctaStyle: "Low-pressure invitation rooted in community impact.",
    formattingGuidance: [
      "Lead with what volunteers make possible — not 'sign up now'.",
      "Be specific only when verified facts support it.",
    ],
    writingRules: [
      "Never invent volunteer roles or counts.",
      "Grateful, community-minded — parents helping parents.",
    ],
  },
  flyer: {
    tone: "Bold and scannable — headline plus essentials.",
    targetLength: "Headline, key details, one CTA — use line breaks.",
    ctaStyle: "Single clear action.",
    formattingGuidance: ["Headline first.", "Line breaks between sections."],
    writingRules: ["Families glance quickly — make it scannable."],
  },
};

function channelToneOverride(
  channel: CommunicationChannel,
  profile: OrganizationAiProfile | null,
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

function resolveChannelCtaStyle(
  preferred: OrganizationVoiceProfile["preferredCtaStyle"],
  channelDefault: string,
): string {
  switch (preferred) {
    case "soft_invite":
      return "Soft invite — welcoming, never pushy.";
    case "question":
      return "Question-based CTA — invite families to consider joining.";
    case "link_forward":
      return "Point to details elsewhere rather than repeating.";
    case "direct":
      return "Direct and clear — still warm.";
    case "volunteer_focused":
      return "Volunteer-focused only when verified needs are on file.";
    default:
      return channelDefault;
  }
}

function emojiRuleForChannel(
  channel: CommunicationChannel,
  usage: OrganizationVoiceProfile["emojiUsage"],
): string {
  const social = channel === "facebook" || channel === "instagram";
  switch (usage) {
    case "none":
      return "No emoji on this channel.";
    case "minimal":
      return social
        ? "At most one emoji, only if it feels natural."
        : "Emoji generally not used on this channel.";
    case "moderate":
      return social ? "Light emoji (1–2) OK." : "Emoji sparingly — channel-appropriate.";
    default:
      return social ? "Emoji welcome when school-appropriate." : "Emoji optional.";
  }
}

function warmthRule(warmth: OrganizationVoiceProfile["warmthLevel"]): string {
  switch (warmth) {
    case "very_warm":
      return "Extra warmth — make families feel genuinely welcomed.";
    case "reserved":
      return "Warm but measured — professional school tone.";
    default:
      return "Warm and welcoming — community-first.";
  }
}
