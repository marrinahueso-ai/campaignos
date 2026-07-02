export type {
  AiActionType,
  AiAssistantStatus,
  AiGenerateTextInput,
  AiGenerateTextResult,
  AiUsageLogInput,
  CommunicationDraftContext,
  DraftCommunicationInput,
  DraftCommunicationResult,
} from "@/lib/ai/types";

import { resolveDraftModel } from "@/lib/ai/models";

export {
  FAST_DRAFT_MODEL,
  QUALITY_DRAFT_MODEL,
  DEFAULT_AI_MODEL,
  maxCompletionTokensForChannel,
  resolveAiModel,
  resolveDraftModel,
  resolveFastDraftModel,
  resolveQualityDraftModel,
} from "@/lib/ai/models";

/** @deprecated Use resolveDraftModel("fast_draft") or FAST_DRAFT_MODEL. */
export const AI_MODEL = resolveDraftModel("fast_draft");

export {
  generateText,
  getAiAssistantStatus,
  isAiConfigured,
} from "@/lib/ai/provider";

export {
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
  buildLegacyDraftSystemPrompt,
  lengthGuidanceForChannel,
} from "@/lib/ai/prompts";

export {
  buildGroundingContext,
  formatGroundingContextForPrompt,
  GROUNDING_SYSTEM_RULES,
} from "@/lib/ai-grounding";
export type { GroundingContext } from "@/lib/ai-grounding";

export {
  buildBrandVoiceContext,
  formatBrandVoiceForPrompt,
  scoreDraftAgainstBrandVoice,
} from "@/lib/brand-voice";
export type { BrandVoiceContext, BrandVoiceScore } from "@/lib/brand-voice";

export { buildCommunicationDraftContext } from "@/lib/ai/context";
export { logAiUsage } from "@/lib/ai/usage";
export { displayDraftContent, isLegacyPlaceholderContent } from "@/lib/ai/content";
export { draftCommunicationWithAi } from "@/lib/ai/draft";
export { draftCommunicationWithAiAction } from "@/lib/ai/actions";

export type {
  CommunicationStrategyPlan,
  OrganizationVoice,
  StrategyDraftPromptBundle,
} from "@/lib/ai-strategy/types";

export {
  buildCommunicationStrategyForDraft,
  buildCommunicationStrategyPlan,
  buildStrategyDraftPrompts,
} from "@/lib/ai-strategy";

/**
 * Future AI integration points:
 *
 * - summarizeEventMemory(memory) — "What worked last year?"
 * - compareYearOverYear(current, prior) — "What changed since last year?"
 * - suggestImprovements(memory) — coaching without auto-apply
 *
 * All should use CommunicationDraftContext / EventMemory as structured inputs.
 */
