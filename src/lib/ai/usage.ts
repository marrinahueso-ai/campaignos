import { createClient } from "@/lib/supabase/server";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import type { AiUsageLogInput } from "@/lib/ai/types";

function channelLabel(channel: AiUsageLogInput["channel"]): string {
  if (!channel) return "event brief";
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel
  );
}

function formatTokenSummary(input: AiUsageLogInput): string {
  if (input.totalTokens != null) {
    return `~${input.totalTokens} tokens`;
  }
  if (input.promptTokens != null || input.completionTokens != null) {
    const parts = [
      input.promptTokens != null ? `${input.promptTokens} prompt` : null,
      input.completionTokens != null ? `${input.completionTokens} completion` : null,
    ].filter(Boolean);
    return parts.join(", ");
  }
  return "tokens unknown";
}

/**
 * Logs AI usage for future Founder Intelligence / budget dashboards.
 * Uses activity_log with communications_generated (no schema change).
 * Also writes structured metadata to server console.
 */
export async function logAiUsage(input: AiUsageLogInput): Promise<void> {
  const label =
    input.actionType === "generate_event_brief"
      ? "Event brief"
      : input.actionType === "generate_creative_brief"
        ? "Creative brief"
        : input.actionType === "orchestrate_artwork"
          ? "Artwork orchestration"
          : input.actionType === "generate_artwork"
            ? "Campaign artwork"
            : input.actionType === "meta_social_caption"
              ? "Meta social caption"
              : channelLabel(input.channel);
  const tokenSummary = formatTokenSummary(input);
  const status = input.success ? "success" : "failure";

  const description =
    input.actionType === "generate_event_brief"
      ? input.success
        ? `AI-generated event brief (${input.model}, ${tokenSummary}).`
        : `Event brief generation did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim()
      : input.actionType === "generate_creative_brief"
        ? input.success
          ? `AI-enhanced creative brief (${input.model}, ${tokenSummary}).`
          : `Creative brief generation did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim()
        : input.actionType === "orchestrate_artwork"
          ? input.success
            ? `Artwork prompt orchestration (${input.model}, ${tokenSummary}).`
            : `Artwork orchestration did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim()
          : input.actionType === "generate_artwork"
            ? input.success
              ? `AI-generated campaign artwork (${input.model}).`
              : `Artwork generation did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim()
            : input.actionType === "meta_social_caption"
              ? input.success
                ? `AI-generated Meta social caption (${input.model}, ${tokenSummary}).`
                : `Meta social caption did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim()
              : input.success
          ? `AI-assisted draft for ${label} (${input.model}, ${tokenSummary}).`
          : `AI draft attempt for ${label} did not complete (${input.model}). ${input.errorMessage ?? ""}`.trim();

  console.info("[ai-usage]", {
    eventId: input.eventId,
    actionType: input.actionType,
    channel: input.channel,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    success: input.success,
    createdAt: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const title =
      input.actionType === "generate_event_brief"
        ? input.success
          ? "Event brief generated"
          : "Event brief attempt"
        : input.actionType === "generate_creative_brief"
          ? input.success
            ? "Creative brief generated"
            : "Creative brief attempt"
          : input.actionType === "orchestrate_artwork"
            ? input.success
              ? "Artwork orchestration completed"
              : "Artwork orchestration attempt"
            : input.actionType === "generate_artwork"
              ? input.success
                ? "Artwork concepts generated"
                : "Artwork generation attempt"
              : input.actionType === "meta_social_caption"
                ? input.success
                  ? "Meta social caption generated"
                  : "Meta social caption attempt"
                : input.success
            ? "First draft ready"
            : "Draft attempt";

    if (!input.eventId) {
      return;
    }

    const { error } = await supabase.from("activity_log").insert({
      event_id: input.eventId,
      activity_type: "communications_generated",
      title,
      description: `${description} [ai:${status}]`,
      occurred_at: now,
    });

    if (error?.code === "42P01") {
      // Table missing — safe no-op
      return;
    }

    if (error) {
      console.error("Failed to log AI usage to activity_log:", error.message);
    }
  } catch (error) {
    console.error("AI usage logging failed:", error);
  }

  // TODO(founder-intelligence): persist to ai_usage_log table when schema exists
}
