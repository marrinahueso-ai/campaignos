"use server";

import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  exportAiApisCsvRows,
  type AiApisFilters,
} from "@/lib/ops/ai-apis-queries";
import { AI_APIS_CSV_EXPORT_CAP } from "@/lib/ops/ai-apis-constants";

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
