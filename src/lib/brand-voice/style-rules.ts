import type { OrganizationVoiceProfile, StyleRules } from "@/lib/brand-voice/types";
import { DISCOURAGED_OPENING_PHRASES } from "@/lib/brand-voice/writing-philosophy";

const CORPORATE_BAN = [
  "leverage",
  "synergy",
  "stakeholders",
  "optimize",
  "streamline",
  "best-in-class",
  "world-class",
  "cutting-edge",
  "deliverables",
  "touch base",
  "circle back",
  "we are excited to announce",
  "dear valued",
  "don't miss out",
  "act now",
  "limited time",
  "please be advised",
  "families are invited",
  "this event will take place",
  "our upcoming event",
  ...DISCOURAGED_OPENING_PHRASES,
];

export function buildStyleRules(profile: OrganizationVoiceProfile): StyleRules {
  const rules: string[] = [
    "Write like an experienced PTO Communications Director talking to other parents — not school administration or a marketing agency.",
    "Lead with emotion and story; verified facts support the moment — never open with bare logistics.",
    "Show before tell: paint the scene, then place date/time/location.",
    "Sound welcoming, optimistic, and genuine — never like ChatGPT or a Fortune 500 press release.",
    "Community-first: families and students come before the organization.",
    firstPersonRule(profile.firstPersonStyle),
    sentenceRule(profile.sentenceLength),
    paragraphRule(profile.paragraphLength),
    punctuationRule(profile.punctuationPreference),
    warmthRule(profile.warmthLevel),
    formalityRule(profile.formalityLevel),
  ];

  if (profile.sourceVoiceNotes) {
    rules.push(`Organization voice notes: ${profile.sourceVoiceNotes}`);
  }

  return {
    rules,
    avoidPatterns: [
      "Corporate AI openings (Friendly reminder, Save the date, Mark your calendars, Join us, Don't miss)",
      "Leading with date/time/location before painting the moment",
      "Overly formal salutations (Dear Valued Community Member, Please be advised)",
      "Bullet-point marketing speak without human warmth",
      "Repeating the same opening pattern used in other campaign messages",
      "Copy that could appear on a Fortune 500 website",
    ],
    corporateLanguageBan: CORPORATE_BAN,
  };
}

function firstPersonRule(style: OrganizationVoiceProfile["firstPersonStyle"]): string {
  switch (style) {
    case "pto":
      return "Write from the PTO using we/our — e.g., 'We invite families…'";
    case "school":
      return "School community perspective when appropriate.";
    case "community":
      return "Inclusive community language — all families welcome.";
    default:
      return "Warm first-person plural (we/our) from the organizing team.";
  }
}

function sentenceRule(length: OrganizationVoiceProfile["sentenceLength"]): string {
  switch (length) {
    case "short":
      return "Prefer short sentences — one idea each.";
    case "long":
      return "Varied sentence length OK — keep readability high.";
    default:
      return "Mix short and medium sentences for natural flow.";
  }
}

function paragraphRule(length: OrganizationVoiceProfile["paragraphLength"]): string {
  switch (length) {
    case "short":
      return "Keep paragraphs to 1–2 sentences.";
    case "long":
      return "Paragraphs may be 3–4 sentences when the channel allows.";
    default:
      return "Paragraphs of 2–3 sentences — easy to skim.";
  }
}

function punctuationRule(
  pref: OrganizationVoiceProfile["punctuationPreference"],
): string {
  switch (pref) {
    case "minimal":
      return "Restrained punctuation — avoid excessive exclamation marks.";
    case "expressive":
      return "Light enthusiasm OK — never shout with punctuation.";
    default:
      return "Standard punctuation — natural, not stiff.";
  }
}

function warmthRule(level: OrganizationVoiceProfile["warmthLevel"]): string {
  switch (level) {
    case "very_warm":
      return "High warmth — make readers feel personally welcomed.";
    case "reserved":
      return "Warm but professional — avoid overly casual slang.";
    default:
      return "Warm and welcoming without being saccharine.";
  }
}

function formalityRule(level: OrganizationVoiceProfile["formalityLevel"]): string {
  switch (level) {
    case "formal":
      return "Formal register — respectful and polished.";
    case "balanced":
      return "Balanced tone — professional yet approachable.";
    default:
      return "Casual school-community tone — friendly neighbor energy.";
  }
}
