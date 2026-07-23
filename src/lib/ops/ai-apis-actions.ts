"use server";

import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  exportAiApisCsvRows,
  type AiApisFilters,
} from "@/lib/ops/ai-apis-queries";
import {
  exportConnectedApisCsvRows,
  type ConnectedApisFilters,
} from "@/lib/ops/connected-apis-queries";
import { AI_APIS_CSV_EXPORT_CAP } from "@/lib/ops/ai-apis-constants";
import { importOpenAiUsageHistory } from "@/lib/ops/openai-usage-import";

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function exportAiApisCsvAction(
  filters: AiApisFilters,
): Promise<{ success: true; csv: string; truncated: boolean } | { success: false; error: string }> {
  if (!(await canAccessOwnerOps())) {
    return { success: false, error: "Not authorized." };
  }

  try {
    const rows = await exportAiApisCsvRows(filters);
    const header = [
      "created_at",
      "request_id",
      "organization",
      "user",
      "feature",
      "model",
      "provider",
      "prompt_tokens",
      "completion_tokens",
      "total_tokens",
      "estimated_cost_usd",
      "latency_ms",
      "success",
      "error_code",
      "environment",
    ];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.createdAt,
          row.requestId,
          row.organizationName,
          row.userLabel,
          row.feature,
          row.model,
          row.provider,
          row.promptTokens,
          row.completionTokens,
          row.totalTokens,
          row.estimatedCostUsd,
          row.latencyMs,
          row.success,
          row.errorCode,
          row.environment,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    return {
      success: true,
      csv: lines.join("\n"),
      truncated: rows.length >= AI_APIS_CSV_EXPORT_CAP,
    };
  } catch (error) {
    console.error("[ai-apis] CSV export failed:", error);
    return { success: false, error: "Could not export CSV." };
  }
}

export async function exportConnectedApisCsvAction(
  filters: ConnectedApisFilters,
): Promise<{ success: true; csv: string; truncated: boolean } | { success: false; error: string }> {
  if (!(await canAccessOwnerOps())) {
    return { success: false, error: "Not authorized." };
  }

  try {
    const rows = await exportConnectedApisCsvRows(filters);
    const header = [
      "created_at",
      "request_id",
      "organization",
      "provider",
      "operation",
      "http_status",
      "success",
      "latency_ms",
      "estimated_cost_usd",
      "error_code",
      "environment",
    ];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.createdAt,
          row.requestId,
          row.organizationName,
          row.provider,
          row.operation,
          row.httpStatus,
          row.success,
          row.latencyMs,
          row.estimatedCostUsd,
          row.errorCode,
          row.environment,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    return {
      success: true,
      csv: lines.join("\n"),
      truncated: rows.length >= AI_APIS_CSV_EXPORT_CAP,
    };
  } catch (error) {
    console.error("[connected-apis] CSV export failed:", error);
    return { success: false, error: "Could not export CSV." };
  }
}

/**
 * One-time Owner import of OpenAI Usage API history (daily×model aggregates)
 * attributed to Edmondson Elementary. Does not run on a schedule.
 */
export async function importOpenAiHistoryAction(): Promise<
  | {
      success: true;
      inserted: number;
      skippedExisting: number;
      daysCovered: number;
      fromIso: string;
      toIsoExclusive: string;
      warnings: string[];
    }
  | { success: false; error: string }
> {
  if (!(await canAccessOwnerOps())) {
    return { success: false, error: "Not authorized." };
  }

  try {
    const result = await importOpenAiUsageHistory({ lookbackDays: 90 });
    return {
      success: true,
      inserted: result.inserted,
      skippedExisting: result.skippedExisting,
      daysCovered: result.daysCovered,
      fromIso: result.range.fromIso,
      toIsoExclusive: result.range.toIsoExclusive,
      warnings: result.warnings,
    };
  } catch (error) {
    console.error("[ai-apis] OpenAI history import failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not import OpenAI usage history.",
    };
  }
}
