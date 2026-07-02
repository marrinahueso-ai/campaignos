import type {
  CommunicationStrategyPlan,
  ExistingCommunicationSummary,
  ParsedStrategyDraftResponse,
  PriorCampaignGuidance,
  RepetitionAvoidance,
  StrategyDraftPromptBundle,
} from "@/lib/ai-strategy/types";
import { hasVerifiedVolunteerNeeds } from "@/lib/ai-strategy/cta";
import {
  formatGroundingContextForPrompt,
  formatGroundingRulesBlock,
  GROUNDING_SYSTEM_RULES,
} from "@/lib/ai-grounding";
import {
  formatBrandVoiceForPrompt,
  buildBrandVoiceSystemPromptAddendum,
  formatWritingPhilosophyBlock,
} from "@/lib/brand-voice";
import type { CommunicationChannel } from "@/types/event-workspace";

const DRAFT_MARKER = "DRAFT:";
const WHY_MARKER = "WHY:";

export function channelGuidanceFor(channel: CommunicationChannel): string {
  switch (channel) {
    case "website_announcement":
      return "Informative and welcoming — story first, verified details second; scannable paragraphs.";
    case "newsletter":
      return "Story first, details second — emotional hook, then verified facts in short paragraphs.";
    case "facebook":
      return "Warm, conversational, community — paint the moment; avoid corporate reminder openings.";
    case "instagram":
      return "Fun, energetic, visual — minimal words; hashtags at end only.";
    case "email":
      return "Personal note to families — greeting, story-led body, warm sign-off; not a marketing blast.";
    case "flyer":
      return "Feeling-first headline, verified essentials, one CTA; line breaks for scanning.";
    case "principal_notes":
      return "Brief staff talking points — warm and professional, not a script.";
    case "morning_announcements":
      return "Short, energetic, read-aloud naturally — 2–3 sentences max.";
    case "volunteer_signup":
      return "Purpose-driven — explain impact before asking; verified volunteer needs only.";
    default:
      return "Human PTO parent voice — emotion and story before logistics.";
  }
}

export function recommendedLengthFor(channel: CommunicationChannel): string {
  switch (channel) {
    case "website_announcement":
      return "2–4 short paragraphs for a school website announcement.";
    case "newsletter":
      return "Medium length — a few paragraphs with a clear call to action.";
    case "facebook":
      return "Short and conversational — 2–4 sentences, whitespace, optional emoji; never a wall of text.";
    case "instagram":
      return "Brief caption — 1–3 sentences plus 3–5 hashtags at the end; minimal words.";
    case "email":
      return "Friendly email — greeting, 2–3 short story-led paragraphs, warm sign-off.";
    case "flyer":
      return "Flyer copy — headline, verified key details, and one call to action. Use line breaks.";
    case "principal_notes":
      return "Brief staff talking points — 3–5 bullet-friendly sentences.";
    case "morning_announcements":
      return "Very short — 2–3 sentences for morning announcements.";
    case "volunteer_signup":
      return "Encouraging volunteer ask — only if verified volunteer needs are on file.";
    default:
      return "Clear and concise for school families.";
  }
}

export function buildRepetitionAvoidance(input: {
  existingCommunications: ExistingCommunicationSummary[];
}): RepetitionAvoidance {
  const others = input.existingCommunications.filter(
    (entry) =>
      !entry.isCurrentItem &&
      typeof entry.contentPreview === "string" &&
      entry.contentPreview.trim().length > 0,
  );

  const coveredTopics = others.map((entry) =>
    entry.stepTitle
      ? `${entry.stepTitle} (${entry.channelLabel}): already shared`
      : `${entry.channelLabel}: already shared`,
  );

  const otherChannelSummaries = others.map((entry) =>
    entry.stepTitle
      ? `${entry.stepTitle} · ${entry.channelLabel} — ${summarizeContent(entry.contentPreview)}`
      : `${entry.channelLabel} — ${summarizeContent(entry.contentPreview)}`,
  );

  const hasPriorMessages = others.length > 0;

  const instruction = hasPriorMessages
    ? [
        "Other timeline steps already have drafts for this event.",
        "Do NOT repeat information those messages already covered (dates, location, theme, volunteer asks, etc.).",
        "Do NOT introduce new facts — only use verified information from the grounding context.",
        "Add a fresh emotional angle or story beat — not the same reminder wording.",
        "Never copy phrasing from prior drafts — write original, human sentences.",
      ].join(" ")
    : "This is early in the campaign — open with emotion and story, then weave in verified core details from grounding.";

  return {
    hasPriorMessages,
    coveredTopics,
    instruction,
    otherChannelSummaries,
  };
}

export function buildPriorCampaignGuidance(
  guidance: PriorCampaignGuidance | null,
): string | null {
  if (!guidance?.hasHistory) return null;

  return [
    `This event has run ${guidance.priorRunCount} time(s) before`,
    guidance.lastRunDate ? `(most recently ${guidance.lastRunDate})` : null,
    "Use prior-run context for strategic guidance only — do NOT copy old wording.",
    guidance.guidance,
  ]
    .filter(Boolean)
    .join(". ");
}

export function buildStrategyExplanation(plan: CommunicationStrategyPlan): string {
  return [
    `${plan.channelLabel} draft for the ${plan.campaignStage.label} stage.`,
    `Goal: ${plan.intent.goal}.`,
    `Audience: ${plan.audience.primary}.`,
    `Primary CTA: ${plan.cta.primary.text}.`,
    plan.repetitionAvoidance.hasPriorMessages
      ? "Written to avoid repeating earlier channel drafts."
      : "Introduces the event with channel-appropriate emphasis.",
  ].join(" ");
}

export function buildStrategySystemPrompt(): string {
  return [
    "You are an experienced PTO Communications Director — a strategist and writer parents trust, not an AI assistant or corporate marketer.",
    GROUNDING_SYSTEM_RULES,
    buildBrandVoiceSystemPromptAddendum(),
    "Follow the campaign strategy brief: stage, intent, audience, tone, CTAs, and repetition rules.",
    "Apply the writing philosophy — emotion and story before logistics; facts support the story.",
    "Write draft copy only — never publish, approve, or schedule anything.",
    "Return only the requested format with no markdown fences or extra commentary.",
    "Before returning, run the quality test: Would a PTO president send this? Would a busy parent enjoy reading it?",
    "Humans will review and edit before anything goes live.",
  ].join(" ");
}

export function buildRegenerationBlock(existingDraft: string): string {
  const preview = existingDraft.trim().slice(0, 1200);

  return [
    "",
    "=== REGENERATION (Draft again) ===",
    "Create a fresh alternative. Do not reuse the same opening, sentence structure, or closing from the latest version.",
    "The text below is the latest prior version — use it ONLY to avoid repeating that exact draft. Do NOT copy phrases, structure, or CTAs from it.",
    "",
    "AVOID REPEATING THIS EXACT DRAFT:",
    preview,
  ].join("\n");
}

export function buildStrategyUserPrompt(plan: CommunicationStrategyPlan): string {
  const groundingBlock = formatGroundingContextForPrompt(plan.groundingContext);
  const brandVoiceBlock = formatBrandVoiceForPrompt(plan.brandVoiceContext);
  const verifiedVolunteerNeeds = hasVerifiedVolunteerNeeds(
    plan.groundingContext.event.volunteerNeeds,
  );

  const ctaLines = [
    "=== CALLS TO ACTION ===",
    "- Weave the CTA into the closing naturally — never paste CTA text as the opening line.",
    `- Primary: ${plan.cta.primary.text} (${plan.cta.primary.action})`,
    plan.cta.secondary
      ? `- Secondary: ${plan.cta.secondary.text} (${plan.cta.secondary.action})`
      : null,
    !verifiedVolunteerNeeds
      ? "- No volunteer information on file — volunteer CTAs are disabled. Do not include volunteer asks, sign-up prompts, headcounts, or helper roles."
      : null,
  ].filter(Boolean);

  const writingPhilosophyBlock = formatWritingPhilosophyBlock({
    eventTitle: plan.eventTitle,
    eventTheme: plan.eventTheme,
    channel: plan.channel,
    stageId: plan.campaignStage.id,
  });

  const lines = [
    `Write a draft for: ${plan.channelLabel}`,
    "",
    writingPhilosophyBlock,
    "",
    groundingBlock,
    "",
    formatGroundingRulesBlock(),
    "",
    brandVoiceBlock,
    "",
    "=== CAMPAIGN STRATEGY ===",
    `Stage: ${plan.campaignStage.label} — ${plan.campaignStage.description}`,
    `Goal: ${plan.intent.goal}`,
    `Focus: ${plan.intent.focus}`,
    `Desired emotion: ${plan.intent.desiredEmotion}`,
    `Messaging angle: ${plan.intent.messagingAngle}`,
    "",
    "=== AUDIENCE ===",
    `- Primary: ${plan.audience.primary}`,
    plan.audience.secondary ? `- Secondary: ${plan.audience.secondary}` : null,
    `- ${plan.audience.addressStyle}`,
    "",
    "=== VOICE & TONE ===",
    `- Tone: ${plan.tone.summary}`,
    ...plan.tone.voiceNotes.map((note) => `- ${note}`),
    ...plan.tone.channelAdjustments.map((note) => `- ${note}`),
    `- Emoji policy: ${plan.emojiPolicy}`,
    "",
    ...ctaLines,
    "",
    "=== CHANNEL & LENGTH ===",
    `- Channel guidance: ${plan.channelGuidance}`,
    `- Recommended length: ${plan.recommendedLength}`,
    "",
    "=== ARTWORK ===",
    `- ${plan.artDirection.strategy}`,
    ...plan.artDirection.visualReferences.map((note) => `- ${note}`),
    plan.artDirection.layoutNotes ? `- Layout: ${plan.artDirection.layoutNotes}` : null,
    "",
    "=== REPETITION AVOIDANCE ===",
    plan.repetitionAvoidance.instruction,
    plan.repetitionAvoidance.otherChannelSummaries.length > 0
      ? "Already covered elsewhere:"
      : null,
    ...plan.repetitionAvoidance.otherChannelSummaries.map(
      (summary) => `- ${summary}`,
    ),
    buildPriorCampaignGuidance(plan.priorCampaignGuidance)
      ? ["", "=== PRIOR CAMPAIGN HISTORY ===", buildPriorCampaignGuidance(plan.priorCampaignGuidance)]
      : null,
    plan.optionalInstructions
      ? ["", `Extra guidance: ${plan.optionalInstructions}`]
      : null,
    plan.existingDraft?.trim()
      ? buildRegenerationBlock(plan.existingDraft)
      : null,
    "",
    "=== OUTPUT FORMAT ===",
    "Return exactly this structure:",
    "DRAFT:",
    "<message body only — no preamble>",
    "",
    "WHY:",
    "<2–3 sentences explaining emotional target, story choices, and how verified facts were woven in>",
  ].filter(Boolean);

  return lines.flat().join("\n");
}

export function buildStrategyDraftPrompts(
  plan: CommunicationStrategyPlan,
): StrategyDraftPromptBundle {
  return {
    systemPrompt: buildStrategySystemPrompt(),
    userPrompt: buildStrategyUserPrompt(plan),
    strategyExplanation: buildStrategyExplanation(plan),
  };
}

export function parseStrategyDraftResponse(raw: string): ParsedStrategyDraftResponse {
  const normalized = raw.trim();
  const draftIndex = normalized.indexOf(DRAFT_MARKER);
  const whyIndex = normalized.indexOf(WHY_MARKER);

  if (draftIndex >= 0 && whyIndex > draftIndex) {
    const draftText = normalized
      .slice(draftIndex + DRAFT_MARKER.length, whyIndex)
      .trim();
    const strategyExplanation = normalized.slice(whyIndex + WHY_MARKER.length).trim();

    if (draftText) {
      return {
        draftText,
        strategyExplanation: strategyExplanation || "Draft follows the campaign strategy brief.",
      };
    }
  }

  return {
    draftText: normalized,
    strategyExplanation: "Draft follows the campaign strategy brief.",
  };
}

function summarizeContent(
  content: string | null | undefined,
  maxLength = 140,
): string {
  if (!content?.trim()) return "";
  const line = content.replace(/\s+/g, " ").trim();
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength)}…`;
}
