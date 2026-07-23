import "server-only";

import { logApiUsage, type ApiUsageProvider } from "@/lib/ops/api-usage";

/** Fire-and-await a connected-API usage row with latency from `startedAt`. */
export async function recordApiCall(input: {
  provider: ApiUsageProvider;
  operation: string;
  startedAt: number;
  success: boolean;
  organizationId?: string | null;
  userId?: string | null;
  eventId?: string | null;
  httpStatus?: number | null;
  errorCode?: string | number | null;
  errorMessage?: string | null;
  estimatedCostUsd?: number | null;
  costUnits?: number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await logApiUsage({
    provider: input.provider,
    operation: input.operation,
    success: input.success,
    organizationId: input.organizationId,
    userId: input.userId,
    eventId: input.eventId,
    httpStatus: input.httpStatus,
    latencyMs: Math.max(0, Date.now() - input.startedAt),
    estimatedCostUsd: input.estimatedCostUsd,
    costUnits: input.costUnits,
    errorCode:
      input.errorCode == null ? null : String(input.errorCode).slice(0, 64),
    errorMessage: input.errorMessage,
    metadata: input.metadata,
  });
}

/** Stable Graph operation label from path (no query string / tokens). */
export function metaOperationFromPath(method: string, path: string): string {
  const clean = path.split("?")[0]?.replace(/^\/+/, "") || "unknown";
  const truncated = clean.length > 120 ? `${clean.slice(0, 119)}…` : clean;
  return `${method.toUpperCase()} /${truncated}`;
}
