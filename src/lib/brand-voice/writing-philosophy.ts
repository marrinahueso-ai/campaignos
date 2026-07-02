import type { CampaignStageId } from "@/lib/ai-strategy/types";
import type { CommunicationChannel } from "@/types/event-workspace";

/** Corporate / AI-default openings — use rarely, never as default. */
export const DISCOURAGED_OPENING_PHRASES = [
  "friendly reminder",
  "mark your calendars",
  "don't miss",
  "save the date",
  "join us",
  "get ready",
  "we hope to see you",
  "please be advised",
  "our upcoming event",
  "families are invited",
  "this event will take place",
  "we are excited to announce",
  "we're excited to announce",
  "dear valued",
  "quick reminder",
  "looking forward to",
] as const;

export const PREFERRED_OPENING_EXAMPLES = [
  "The countdown is on...",
  "It's almost here!",
  "Today's the day!",
  "One week to go...",
  "We're so excited...",
  "Our halls are about to get a lot louder...",
  "Grab your favorite school shirt...",
  "One of our favorite traditions returns...",
  "School is almost back!",
  "Ready for some fun?",
  "Thank you for making our school amazing.",
] as const;

export const WRITING_PRIORITY_ORDER = [
  "Emotion — how should the parent FEEL after reading?",
  "Community — belonging, togetherness, school pride",
  "Story — paint the moment before logistics",
  "Information — verified facts that support the story",
  "Logistics — date, time, location (never lead with these unless emergency)",
] as const;

export const QUALITY_TEST_QUESTIONS = [
  "Would a PTO president actually send this?",
  "Would a busy parent enjoy reading this?",
  "Does the first sentence make someone want to keep reading?",
  "Does this sound like a real person — not ChatGPT or a marketing agency?",
  "Could this belong to this specific school community?",
] as const;

const EVENT_EMOTION_KEYWORDS: Array<{ keywords: string[]; target: string }> = [
  { keywords: ["back to school", "first day", "meet the teacher"], target: "Excitement" },
  { keywords: ["spirit store", "spirit wear", "spirit shirt"], target: "School pride" },
  { keywords: ["teacher appreciation", "staff appreciation"], target: "Gratitude" },
  { keywords: ["fun run", "jog", "color run"], target: "Energy" },
  { keywords: ["book fair"], target: "Curiosity" },
  { keywords: ["playdate", "play date", "social"], target: "Belonging" },
  { keywords: ["fundraiser", "auction", "gal"], target: "Purpose" },
  { keywords: ["volunteer", "signup", "sign-up"], target: "Community" },
  { keywords: ["stock the fridge", "teacher lunch", "meal train"], target: "Generosity" },
  { keywords: ["donuts", "muffins", "coffee with"], target: "Connection" },
  { keywords: ["carnival", "fair", "festival"], target: "Joy and anticipation" },
  { keywords: ["thank you", "gratitude"], target: "Gratitude and celebration" },
];

const STAGE_EMOTION_FALLBACK: Record<CampaignStageId, string> = {
  announcement: "Curiosity and welcome",
  reminder: "Anticipation and belonging",
  day_before: "Excitement and readiness",
  today: "Energy and celebration",
  thank_you: "Gratitude and connection",
};

const CHANNEL_EMOTION_NUDGE: Partial<Record<CommunicationChannel, string>> = {
  instagram: "Fun and visual energy",
  facebook: "Warm community connection",
  newsletter: "Story-first belonging",
  morning_announcements: "Energetic and read-aloud friendly",
  volunteer_signup: "Purpose and community impact",
  email: "Personal warmth and trust",
};

export function resolveEmotionalTarget(input: {
  eventTitle: string;
  eventTheme: string | null;
  channel: CommunicationChannel;
  stageId: CampaignStageId;
}): string {
  const haystack = `${input.eventTitle} ${input.eventTheme ?? ""}`.toLowerCase();

  for (const entry of EVENT_EMOTION_KEYWORDS) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.target;
    }
  }

  const channelNudge = CHANNEL_EMOTION_NUDGE[input.channel];
  const stageFallback = STAGE_EMOTION_FALLBACK[input.stageId];

  return channelNudge
    ? `${channelNudge} (optimize toward: ${stageFallback})`
    : stageFallback;
}

export function buildWritingPhilosophySystemRules(): string {
  return [
    "You write as an experienced PTO Communications Director — not an AI assistant, not corporate marketing, not school administration.",
    "Facts support the story. Facts are not the story.",
    "Before writing, decide: (1) how the parent should FEEL, (2) the most warm or meaningful part of this event, (3) how to paint the moment before logistics.",
    `Writing priority order (never reverse unless emergency): ${WRITING_PRIORITY_ORDER.join(" → ")}.`,
    "Show before tell — paint the scene, then place verified logistics.",
    "Write like parents talking to parents: welcoming, optimistic, genuine.",
    "If the copy could appear on a Fortune 500 website, rewrite it.",
    `Run this quality test before returning: ${QUALITY_TEST_QUESTIONS.join(" ")}`,
  ].join(" ");
}

export function formatWritingPhilosophyForPrompt(input: {
  emotionalTarget: string;
  channel: CommunicationChannel;
}): string {
  const showBeforeTell =
    input.channel === "morning_announcements" || input.channel === "instagram"
      ? "Keep it tight — one vivid image, then the key fact."
      : "Open with a sensory or emotional image, then weave in verified date/time/location.";

  return [
    "=== WRITING PHILOSOPHY (CREATIVE DIRECTION) ===",
    "Answer BEFORE you write:",
    "1. How should the parent FEEL after reading this?",
    "2. What is the most exciting, warm, or meaningful part of this event?",
    "3. How can I paint the moment before giving logistics?",
    "",
    `EMOTIONAL TARGET FOR THIS DRAFT: ${input.emotionalTarget}`,
    "Optimize the entire message toward ONE emotional outcome.",
    "",
    "WRITING PRIORITIES (in order — do not reverse unless emergency):",
    ...WRITING_PRIORITY_ORDER.map((item, index) => `${index + 1}. ${item}`),
    "",
    "SHOW BEFORE TELL",
    `- ${showBeforeTell}`,
    '- Bad: "The Fun Run is on Friday." Good: "Running shoes, music, cheering classmates… Friday is almost here."',
    '- Bad: "The fair is August 5." Good: "Before the first bell rings, we\'ll gather to meet teachers and reconnect — another year starts together."',
    "",
    "FORMATTING",
    "- Short paragraphs, natural breaks, whitespace, easy mobile reading.",
    "- Bullets OK when they help scanning.",
    "- Emoji when channel policy allows — never emoji-stuff.",
    input.channel === "newsletter" || input.channel === "email"
      ? "- Newsletter/email may use longer form — still story first, details second."
      : "- Avoid walls of text on this channel.",
    "",
    "STRONGLY DISCOURAGE (rare at most — never default openings):",
    ...DISCOURAGED_OPENING_PHRASES.map((phrase) => `- "${phrase}"`),
    "",
    "PREFER HUMAN OPENINGS (adapt naturally — do not copy verbatim every time):",
    ...PREFERRED_OPENING_EXAMPLES.map((example) => `- ${example}`),
    "",
    "QUALITY TEST (rewrite if any answer is no):",
    ...QUALITY_TEST_QUESTIONS.map((question) => `- ${question}`),
  ].join("\n");
}
