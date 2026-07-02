import type { CommunicationChannel } from "@/types/event-workspace";

/** Default for Draft for me, Draft again, and Draft all messages. */
export const FAST_DRAFT_MODEL = "gpt-4o-mini";

/** Optional high-quality model — not used for default draft generation. */
export const QUALITY_DRAFT_MODEL = "gpt-5-mini";

/** @deprecated Use FAST_DRAFT_MODEL or resolveFastDraftModel(). */
export const DEFAULT_AI_MODEL = FAST_DRAFT_MODEL;

export type DraftModelPurpose = "fast_draft" | "quality_draft";

export function resolveFastDraftModel(): string {
  return process.env.OPENAI_FAST_DRAFT_MODEL?.trim() || FAST_DRAFT_MODEL;
}

export function resolveQualityDraftModel(): string {
  return process.env.OPENAI_QUALITY_DRAFT_MODEL?.trim() || QUALITY_DRAFT_MODEL;
}

/** Resolves the model for a draft purpose. All UI draft flows use fast_draft. */
export function resolveDraftModel(purpose: DraftModelPurpose = "fast_draft"): string {
  return purpose === "quality_draft"
    ? resolveQualityDraftModel()
    : resolveFastDraftModel();
}

/** Ultimate fallback when the primary model fails or returns empty content. */
export function resolveDraftFallbackModel(primaryModel: string): string {
  if (primaryModel === resolveQualityDraftModel()) {
    return resolveFastDraftModel();
  }
  return FAST_DRAFT_MODEL;
}

/** @deprecated Use resolveFastDraftModel() for draft generation. */
export function resolveAiModel(): string {
  return resolveFastDraftModel();
}

const SHORT_CHANNEL_LIMIT = 400;
const WEBSITE_CHANNEL_LIMIT = 500;
const LONG_CHANNEL_LIMIT = 900;
const DEFAULT_CHANNEL_LIMIT = 500;

/** Channel-aware completion token cap to reduce latency on short-form channels. */
export function maxCompletionTokensForChannel(channel: CommunicationChannel): number {
  switch (channel) {
    case "facebook":
    case "instagram":
    case "morning_announcements":
      return SHORT_CHANNEL_LIMIT;
    case "website_announcement":
      return WEBSITE_CHANNEL_LIMIT;
    case "newsletter":
    case "email":
      return LONG_CHANNEL_LIMIT;
    case "flyer":
    case "principal_notes":
    case "volunteer_signup":
      return DEFAULT_CHANNEL_LIMIT;
    default:
      return DEFAULT_CHANNEL_LIMIT;
  }
}
