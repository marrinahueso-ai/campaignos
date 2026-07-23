/** Shared helpers for Owner AI & APIs usage writers. */

export const USAGE_ERROR_MESSAGE_MAX = 500;

export function truncateUsageErrorMessage(
  message: string | null | undefined,
): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (trimmed.length <= USAGE_ERROR_MESSAGE_MAX) return trimmed;
  return `${trimmed.slice(0, USAGE_ERROR_MESSAGE_MAX - 1)}…`;
}

export function resolveUsageEnvironment(
  explicit?: "production" | "development" | null,
): "production" | "development" {
  if (explicit === "production" || explicit === "development") return explicit;
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export function newUsageRequestId(explicit?: string | null): string {
  if (explicit?.trim()) return explicit.trim();
  return crypto.randomUUID();
}

/**
 * Scrub connected-API metadata before persist/export.
 * Drops secret-ish keys; truncates string values.
 */
export function scrubApiUsageMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("authorization") ||
      lower.includes("api_key") ||
      lower.includes("apikey")
    ) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = typeof value === "string" ? value.slice(0, 200) : value;
    }
  }
  return out;
}

/** Map legacy / call-site action types to Owner UI feature keys. */
export function featureFromAiActionType(actionType: string): string {
  switch (actionType) {
    case "draft_communication":
      return "create_with_ai_draft";
    case "meta_social_caption":
      return "create_with_ai_caption";
    case "generate_event_brief":
      return "event_brief";
    case "generate_creative_brief":
      return "creative_brief";
    case "orchestrate_artwork":
      return "artwork_orchestration";
    case "generate_artwork":
      return "artwork";
    case "ask_ralli":
      return "ask_ralli";
    case "inbox_ai":
      return "inbox_ai";
    case "calendar_import_parse":
      return "calendar_import";
    case "tasks_generate":
      return "tasks_generate";
    case "playbook_insights":
      return "playbook_insights";
    default:
      return actionType;
  }
}
