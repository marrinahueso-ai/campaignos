import "server-only";

import {
  AI_APIS_COLLECTING_SINCE,
  AI_APIS_HISTORY_ATTRIBUTE_ORG_ID,
  AI_APIS_OPENAI_IMPORT_ACTION,
  AI_APIS_OPENAI_IMPORT_FEATURE,
} from "@/lib/ops/ai-apis-constants";
import {
  estimateAiUsageCostUsd,
  roundCostUsd,
} from "@/lib/ops/ai-pricing";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

type CompletionsResult = {
  input_tokens?: number;
  output_tokens?: number;
  num_model_requests?: number;
  model?: string | null;
};

type UsageBucket = {
  start_time: number;
  end_time: number;
  results?: CompletionsResult[];
};

type CostsBucket = {
  start_time: number;
  results?: Array<{
    amount?: { value?: number };
  }>;
};

type ImportRow = {
  request_id: string;
  created_at: string;
  organization_id: string;
  feature: string;
  action_type: string;
  provider: string;
  model: string;
  environment: "production";
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  image_units: number | null;
  estimated_cost_usd: number | null;
  latency_ms: null;
  success: true;
  error_code: null;
  error_message: string | null;
  channel: null;
  user_id: null;
  event_id: null;
};

export type OpenAiHistoryImportResult = {
  inserted: number;
  skippedExisting: number;
  daysCovered: number;
  attributedOrganizationId: string;
  range: { fromIso: string; toIsoExclusive: string };
  warnings: string[];
};

function adminKey(): string | null {
  return (
    process.env.OPENAI_ADMIN_KEY?.trim() ||
    process.env.OPENAI_USAGE_API_KEY?.trim() ||
    null
  );
}

async function fetchUsagePages(
  path: "/organization/usage/completions" | "/organization/usage/images",
  startTime: number,
  endTime: number,
): Promise<UsageBucket[]> {
  const key = adminKey();
  if (!key) {
    throw new Error(
      "Missing OPENAI_ADMIN_KEY (Admin API key with api.usage.read). Create one at platform.openai.com → Organization → Admin keys.",
    );
  }

  const buckets: UsageBucket[] = [];
  let page: string | undefined;
  for (let i = 0; i < 40; i += 1) {
    const url = new URL(`https://api.openai.com/v1${path}`);
    url.searchParams.set("start_time", String(startTime));
    url.searchParams.set("end_time", String(endTime));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "31");
    url.searchParams.append("group_by", "model");
    if (page) url.searchParams.set("page", page);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const json = (await response.json()) as {
      data?: UsageBucket[];
      next_page?: string | null;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        json.error?.message ||
          `OpenAI usage API ${path} failed (${response.status})`,
      );
    }
    buckets.push(...(json.data ?? []));
    page = json.next_page ?? undefined;
    if (!page) break;
  }
  return buckets;
}

async function fetchCostByDay(
  startTime: number,
  endTime: number,
): Promise<Map<string, number>> {
  const key = adminKey();
  if (!key) return new Map();

  const byDay = new Map<string, number>();
  let page: string | undefined;
  for (let i = 0; i < 40; i += 1) {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", String(startTime));
    url.searchParams.set("end_time", String(endTime));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "31");
    if (page) url.searchParams.set("page", page);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const json = (await response.json()) as {
      data?: CostsBucket[];
      next_page?: string | null;
    };
    if (!response.ok) return byDay;

    for (const bucket of json.data ?? []) {
      const day = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
      const amount = (bucket.results ?? []).reduce(
        (sum, row) => sum + (Number(row.amount?.value) || 0),
        0,
      );
      byDay.set(day, (byDay.get(day) ?? 0) + amount);
    }
    page = json.next_page ?? undefined;
    if (!page) break;
  }
  return byDay;
}

function dayKeyFromUnix(startTime: number): string {
  return new Date(startTime * 1000).toISOString().slice(0, 10);
}

/**
 * One-time Owner import of OpenAI account usage (daily × model aggregates)
 * into `ai_usage_log`, attributed to Edmondson Elementary.
 *
 * Imports only days **before** `AI_APIS_COLLECTING_SINCE` so live app logs
 * are not double-counted going forward.
 */
export async function importOpenAiUsageHistory(input?: {
  lookbackDays?: number;
  organizationId?: string;
}): Promise<OpenAiHistoryImportResult> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const lookbackDays = Math.min(Math.max(input?.lookbackDays ?? 90, 7), 180);
  const organizationId =
    input?.organizationId?.trim() || AI_APIS_HISTORY_ATTRIBUTE_ORG_ID;
  const warnings: string[] = [];

  const collectingStart = new Date(`${AI_APIS_COLLECTING_SINCE}T00:00:00.000Z`);
  const endExclusive = collectingStart;
  const start = new Date(endExclusive);
  start.setUTCDate(start.getUTCDate() - lookbackDays);

  const startTime = Math.floor(start.getTime() / 1000);
  const endTime = Math.floor(endExclusive.getTime() / 1000);

  if (endTime <= startTime) {
    throw new Error("Import range is empty — check AI_APIS_COLLECTING_SINCE.");
  }

  const [completionBuckets, imageBuckets, costByDay] = await Promise.all([
    fetchUsagePages("/organization/usage/completions", startTime, endTime),
    fetchUsagePages("/organization/usage/images", startTime, endTime).catch(
      (error) => {
        warnings.push(
          `Images usage skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
        return [] as UsageBucket[];
      },
    ),
    fetchCostByDay(startTime, endTime),
  ]);

  const pending: ImportRow[] = [];
  const tokensByDay = new Map<string, number>();

  function addBucket(bucket: UsageBucket, kind: "completions" | "images") {
    const day = dayKeyFromUnix(bucket.start_time);
    for (const result of bucket.results ?? []) {
      const model =
        (result.model && String(result.model).trim()) ||
        (kind === "images" ? "gpt-image-1" : "unknown");
      const prompt = Math.max(0, Number(result.input_tokens) || 0);
      const completion = Math.max(0, Number(result.output_tokens) || 0);
      const total = prompt + completion;
      const requests = Math.max(0, Number(result.num_model_requests) || 0);
      if (total === 0 && requests === 0) continue;

      tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + Math.max(total, 1));

      const estimated =
        kind === "images"
          ? roundCostUsd(
              estimateAiUsageCostUsd({
                model,
                imageUnits: Math.max(1, requests || 1),
              }),
            )
          : roundCostUsd(
              estimateAiUsageCostUsd({
                model,
                promptTokens: prompt,
                completionTokens: completion,
              }),
            );

      pending.push({
        request_id: `openai-hist:${kind}:${day}:${model}`,
        created_at: `${day}T12:00:00.000Z`,
        organization_id: organizationId,
        feature: AI_APIS_OPENAI_IMPORT_FEATURE,
        action_type: AI_APIS_OPENAI_IMPORT_ACTION,
        provider: "openai",
        model,
        environment: "production",
        prompt_tokens: prompt > 0 ? prompt : null,
        completion_tokens: completion > 0 ? completion : null,
        total_tokens: total > 0 ? total : null,
        image_units: kind === "images" ? Math.max(1, requests || 1) : null,
        estimated_cost_usd: estimated,
        latency_ms: null,
        success: true,
        error_code: null,
        error_message:
          requests > 0
            ? `OpenAI Usage API aggregate: ${requests} model request(s) that day`
            : "OpenAI Usage API daily aggregate (one-time Owner import)",
        channel: null,
        user_id: null,
        event_id: null,
      });
    }
  }

  for (const bucket of completionBuckets) addBucket(bucket, "completions");
  for (const bucket of imageBuckets) addBucket(bucket, "images");

  for (const row of pending) {
    const day = row.created_at.slice(0, 10);
    const dayCost = costByDay.get(day);
    if (dayCost == null || dayCost <= 0) continue;
    const dayTokens = tokensByDay.get(day) ?? 0;
    const dayRows = pending.filter((r) => r.created_at.startsWith(day));
    if (dayTokens <= 0) {
      row.estimated_cost_usd = roundCostUsd(dayCost / Math.max(1, dayRows.length));
      continue;
    }
    const share = (row.total_tokens || 0) / dayTokens;
    row.estimated_cost_usd = roundCostUsd(dayCost * share);
  }

  if (!pending.length) {
    return {
      inserted: 0,
      skippedExisting: 0,
      daysCovered: 0,
      attributedOrganizationId: organizationId,
      range: {
        fromIso: start.toISOString(),
        toIsoExclusive: endExclusive.toISOString(),
      },
      warnings: [
        ...warnings,
        "OpenAI returned no usage buckets in range (or Admin key cannot read usage).",
      ],
    };
  }

  const admin = createAdminClient();
  const requestIds = pending.map((row) => row.request_id);
  const { data: existing, error: existingError } = await admin
    .from("ai_usage_log")
    .select("request_id")
    .in("request_id", requestIds);
  if (existingError) {
    throw new Error(`Could not check existing imports: ${existingError.message}`);
  }
  const existingIds = new Set(
    (existing ?? []).map((row) => row.request_id as string),
  );
  const toInsert = pending.filter((row) => !existingIds.has(row.request_id));

  let inserted = 0;
  const chunkSize = 100;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error } = await admin.from("ai_usage_log").insert(chunk);
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
    inserted += chunk.length;
  }

  return {
    inserted,
    skippedExisting: pending.length - toInsert.length,
    daysCovered: new Set(pending.map((row) => row.created_at.slice(0, 10))).size,
    attributedOrganizationId: organizationId,
    range: {
      fromIso: start.toISOString(),
      toIsoExclusive: endExclusive.toISOString(),
    },
    warnings,
  };
}

export function isOpenAiAdminUsageConfigured(): boolean {
  return Boolean(adminKey());
}
