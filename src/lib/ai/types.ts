import type { CommunicationStrategyPlan } from "@/lib/ai-strategy/types";
import type { GroundingContext } from "@/lib/ai-grounding/types";
import type { BrandVoiceContext } from "@/lib/brand-voice/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { CommunicationChannel } from "@/types/event-workspace";

export type { DraftModelPurpose } from "@/lib/ai/models";

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

export type AiActionType =
  | "draft_communication"
  | "meta_social_caption"
  | "generate_event_brief"
  | "generate_creative_brief"
  | "orchestrate_artwork"
  | "generate_artwork";

export interface AiGenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** When set, overrides resolveAiModel() for this request. */
  model?: string;
  /** Public image URL for vision-augmented generation. */
  imageUrl?: string | null;
  /** Request JSON object responses from OpenAI when supported. */
  jsonMode?: boolean;
}

export interface AiGenerateTextResult {
  success: boolean;
  text: string | null;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  error: string | null;
  errorCode: "missing_key" | "api_error" | "empty_response" | null;
  configuredModel: string;
  usedFallbackModel: boolean;
}

export interface AiAssistantStatus {
  available: boolean;
  reason: string | null;
}

export interface CommunicationDraftContext {
  organizationName: string | null;
  organizationVoice: string | null;
  audienceDefaults: string | null;
  writingStyle: string | null;
  channelTone: string | null;
  emojiUsage: string | null;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventDescription: string;
  eventLocation: string | null;
  eventAudience: string | null;
  eventTheme: string | null;
  communicationStrategy: CommunicationStrategy;
  communicationStrategyLabel: string;
  campaignSummary: string | null;
  campaignCompletionPercent: number | null;
  artworkAvailable: boolean;
  channel: CommunicationChannel;
  channelLabel: string;
  existingDraft: string | null;
  lengthGuidance: string;
  optionalInstructions: string | null;
  strategyPlan: CommunicationStrategyPlan | null;
  groundingContext: GroundingContext;
  brandVoiceContext: BrandVoiceContext;
}

export interface DraftCommunicationInput {
  eventId: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  stepId?: string | null;
  instructions?: string | null;
  /** When provided, summary is printed by the caller after revalidate / activity log. */
  performance?: import("@/lib/ai/draft-performance").DraftPerformanceTracker;
}

export interface DraftCommunicationResult {
  success: boolean;
  error: string | null;
  draftText: string | null;
  strategyExplanation: string | null;
  versionNumber: number | null;
}

export interface AiUsageLogInput {
  eventId: string | null;
  actionType: AiActionType;
  channel: CommunicationChannel | null;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  success: boolean;
  errorMessage?: string | null;
}

export interface EventBriefInput {
  title: string;
  roughDescription: string;
  audience: string | null;
  theme: string | null;
  category: string | null;
  eventTypeLabel: string | null;
  communicationStrategyLabel: string | null;
  location: string | null;
  date: string | null;
  time: string | null;
  volunteerNeeds: string | null;
}

export interface GenerateEventBriefResult {
  success: boolean;
  error: string | null;
  brief: string | null;
}

export type GenerateEventBriefActionState = GenerateEventBriefResult;
