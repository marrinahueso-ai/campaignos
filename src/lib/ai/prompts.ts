import type { CommunicationDraftContext } from "@/lib/ai/types";
import {
  buildStrategyDraftPrompts,
  buildStrategySystemPrompt,
  buildStrategyUserPrompt,
  buildRegenerationBlock,
  recommendedLengthFor,
} from "@/lib/ai-strategy";
import type { CommunicationStrategyPlan } from "@/lib/ai-strategy/types";
import {
  formatGroundingContextForPrompt,
  formatGroundingRulesBlock,
} from "@/lib/ai-grounding";
import {
  formatBrandVoiceForPrompt,
  formatWritingPhilosophyBlock,
} from "@/lib/brand-voice";

export function buildDraftSystemPrompt(): string {
  return buildStrategySystemPrompt();
}

export function buildDraftUserPrompt(
  context: CommunicationDraftContext,
): string {
  if (context.strategyPlan) {
    return buildStrategyUserPrompt(context.strategyPlan);
  }

  return buildLegacyDraftUserPrompt(context);
}

export function buildDraftPromptsFromStrategy(
  plan: CommunicationStrategyPlan,
): { systemPrompt: string; userPrompt: string; strategyExplanation: string } {
  return buildStrategyDraftPrompts(plan);
}

function buildLegacyDraftUserPrompt(context: CommunicationDraftContext): string {
  const groundingBlock = formatGroundingContextForPrompt(context.groundingContext);
  const brandVoiceBlock = formatBrandVoiceForPrompt(context.brandVoiceContext);
  const writingPhilosophyBlock = formatWritingPhilosophyBlock({
    eventTitle: context.eventTitle,
    eventTheme: context.eventTheme,
    channel: context.channel,
    stageId: "announcement",
  });

  const lines = [
    `Write a first draft for: ${context.channelLabel}`,
    "",
    writingPhilosophyBlock,
    "",
    groundingBlock,
    "",
    formatGroundingRulesBlock(),
    "",
    brandVoiceBlock,
    "",
    `Length: ${context.lengthGuidance}`,
    "",
    context.campaignSummary ? `- Campaign status: ${context.campaignSummary}` : null,
    "",
    context.existingDraft?.trim()
      ? buildRegenerationBlock(context.existingDraft)
      : null,
    context.optionalInstructions
      ? `Extra guidance from the volunteer: ${context.optionalInstructions}`
      : null,
    "",
    "=== OUTPUT ===",
    "Return the draft message body only — no preamble.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildLegacyDraftSystemPrompt(): string {
  return buildStrategySystemPrompt();
}

export function lengthGuidanceForChannel(
  channel: CommunicationDraftContext["channel"],
): string {
  return recommendedLengthFor(channel);
}
