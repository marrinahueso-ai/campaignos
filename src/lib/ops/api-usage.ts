import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  estimateApiUsageCostUsd,
  roundCostUsd,
} from "@/lib/ops/ai-pricing";
import {
  newUsageRequestId,
  resolveUsageEnvironment,
  scrubApiUsageMetadata,
  truncateUsageErrorMessage,
} from "@/lib/ops/usage-log-shared";

export type ApiUsageProvider =
  | "meta"
  | "resend"
  | "google"
  | "microsoft"
  | "signupgenius"
  | "stripe"
  | "supabase"
  | (string & {});

export type ApiUsageLogInput = {
  provider: ApiUsageProvider;
  operation: string;
  success: boolean;
  organizationId?: string | null;
  userId?: string | null;
  eventId?: string | null;
  httpStatus?: number | null;
  latencyMs?: number | null;
  estimatedCostUsd?: number | null;
  /** Multiplier for unit pricing (default 1 when provider has a unit rate). */
  costUnits?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  environment?: "production" | "development" | null;
  /** Small scrubbed metadata only — never secrets or full payloads. */
  metadata?: Record<string, unknown> | null;
};

/**
 * Persist a connected-API usage row for Owner AI & APIs.
 * No-op (console warn) when admin client or table is unavailable.
 */
export async function logApiUsage(input: ApiUsageLogInput): Promise<void> {
  const provider = input.provider.trim().toLowerCase();
  const operation = input.operation.trim();
  if (!provider || !operation) {
    console.warn("[api-usage] provider and operation are required");
    return;
  }

  const estimatedCostUsd = roundCostUsd(
    estimateApiUsageCostUsd({
      provider,
      estimatedCostUsd: input.estimatedCostUsd,
      units: input.costUnits,
    }),
  );

  console.info("[api-usage]", {
    provider,
    operation,
    organizationId: input.organizationId ?? null,
    success: input.success,
    httpStatus: input.httpStatus ?? null,
    latencyMs: input.latencyMs ?? null,
    estimatedCostUsd,
    createdAt: new Date().toISOString(),
  });

  if (!isSupabaseAdminConfigured()) {
    console.warn("[api-usage] admin client not configured; skipping api_usage_log");
    return;
  }

  const row = {
    request_id: newUsageRequestId(input.requestId),
    organization_id: input.organizationId?.trim() || null,
    user_id: input.userId?.trim() || null,
    event_id: input.eventId?.trim() || null,
    provider,
    operation,
    environment: resolveUsageEnvironment(input.environment),
    http_status: input.httpStatus ?? null,
    success: input.success,
    latency_ms: input.latencyMs ?? null,
    estimated_cost_usd: estimatedCostUsd,
    error_code: input.errorCode?.trim() || null,
    error_message: truncateUsageErrorMessage(input.errorMessage),
    metadata: scrubApiUsageMetadata(input.metadata),
  };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("api_usage_log").insert(row);
    if (error?.code === "42P01") {
      console.warn("[api-usage] api_usage_log missing; apply migration");
      return;
    }
    if (error) {
      console.error("Failed to persist api_usage_log:", error.message);
    }
  } catch (error) {
    console.error("api_usage_log persist failed:", error);
  }
}
