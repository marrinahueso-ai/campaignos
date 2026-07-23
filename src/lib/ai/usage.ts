import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import type { AiUsageLogInput } from "@/lib/ai/types";
import {
  estimateAiUsageCostUsd,
  roundCostUsd,
} from "@/lib/ops/ai-pricing";
import {
  featureFromAiActionType,
  newUsageRequestId,
  resolveUsageEnvironment,
  truncateUsageErrorMessage,
} from "@/lib/ops/usage-log-shared";

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
      input.completionTokens != null
        ? `${input.completionTokens} completion`
        : null,
    ].filter(Boolean);
    return parts.join(", ");
  }
  return "tokens unknown";
}

async function resolveOrganizationId(input: {
  organizationId?: string | null;
  eventId?: string | null;
}): Promise<string | null> {
  if (input.organizationId?.trim()) return input.organizationId.trim();
  if (!input.eventId?.trim() || !isSupabaseAdminConfigured()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("events")
      .select("organization_id")
      .eq("id", input.eventId)
      .maybeSingle();
    if (error) {
      console.error(
        "[ai-usage] organization lookup failed:",
        error.message,
      );
      return null;
    }
    return data?.organization_id ?? null;
  } catch (error) {
    console.error("[ai-usage] organization lookup failed:", error);
    return null;
  }
}

async function persistAiUsageLog(input: AiUsageLogInput): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    console.warn("[ai-usage] admin client not configured; skipping ai_usage_log");
    return;
  }

  const organizationId = await resolveOrganizationId({
    organizationId: input.organizationId,
    eventId: input.eventId,
  });

  const imageUnits =
    input.imageUnits ??
    (input.actionType === "generate_artwork" && input.success ? 1 : null);

  const estimatedCostUsd = roundCostUsd(
    estimateAiUsageCostUsd({
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      imageUnits,
      estimatedCostUsd: input.estimatedCostUsd,
    }),
  );

  const row = {
    request_id: newUsageRequestId(input.requestId),
    organization_id: organizationId,
    user_id: input.userId?.trim() || null,
    event_id: input.eventId?.trim() || null,
    feature: (input.feature?.trim() || featureFromAiActionType(input.actionType)),
    action_type: input.actionType,
    provider: (input.provider?.trim() || "openai").toLowerCase(),
    model: input.model,
    environment: resolveUsageEnvironment(input.environment),
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    total_tokens: input.totalTokens,
    image_units: imageUnits,
    estimated_cost_usd: estimatedCostUsd,
    latency_ms: input.latencyMs ?? null,
    success: input.success,
    error_code: input.errorCode?.trim() || null,
    error_message: truncateUsageErrorMessage(input.errorMessage),
    channel: input.channel,
  };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("ai_usage_log").insert(row);
    if (error?.code === "42P01") {
      // Table not migrated yet — safe no-op until Phase 1 SQL is applied.
      console.warn("[ai-usage] ai_usage_log missing; apply migration");
      return;
    }
    if (error) {
      console.error("Failed to persist ai_usage_log:", error.message);
    }
  } catch (error) {
    console.error("ai_usage_log persist failed:", error);
  }
}

/**
 * Logs AI usage for Owner AI & APIs (`ai_usage_log`) plus event activity_log
 * when an eventId is present. Always writes structured console metadata.
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
    organizationId: input.organizationId ?? null,
    actionType: input.actionType,
    feature: input.feature ?? featureFromAiActionType(input.actionType),
    channel: input.channel,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    latencyMs: input.latencyMs ?? null,
    success: input.success,
    createdAt: new Date().toISOString(),
  });

  await persistAiUsageLog(input);

  try {
    if (!input.eventId) {
      return;
    }

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

    const { error } = await supabase.from("activity_log").insert({
      event_id: input.eventId,
      activity_type: "communications_generated",
      title,
      description: `${description} [ai:${status}]`,
      occurred_at: now,
    });

    if (error?.code === "42P01") {
      return;
    }

    if (error) {
      console.error("Failed to log AI usage to activity_log:", error.message);
    }
  } catch (error) {
    console.error("AI usage activity_log failed:", error);
  }
}
