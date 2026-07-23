import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  AI_APIS_AGGREGATE_ROW_CAP,
  AI_APIS_CSV_EXPORT_CAP,
  AI_APIS_PINNED_ORGANIZATIONS,
  AI_APIS_TABLE_PAGE_SIZE,
  AI_ORGS_NEAR_LIMIT_USD,
} from "@/lib/ops/ai-apis-constants";

export type AiApisSortKey =
  | "created_at"
  | "estimated_cost_usd"
  | "total_tokens"
  | "latency_ms"
  | "feature"
  | "model"
  | "success";

export type AiApisFilters = {
  fromIso: string;
  toIso: string;
  search?: string | null;
  organizationId?: string | null;
  feature?: string | null;
  model?: string | null;
  provider?: string | null;
  status?: "success" | "failed" | null;
  page?: number;
  pageSize?: number;
  sortKey?: AiApisSortKey;
  sortDir?: "asc" | "desc";
};

export type AiUsageRow = {
  id: string;
  requestId: string;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  userId: string | null;
  userLabel: string | null;
  eventId: string | null;
  feature: string;
  actionType: string;
  provider: string;
  model: string;
  environment: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  imageUnits: number | null;
  estimatedCostUsd: number | null;
  latencyMs: number | null;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  channel: string | null;
};

export type AiApisSummary = {
  requests: number;
  totalCostUsd: number;
  totalTokens: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  failedRequests: number;
  orgsNearLimit: number;
  estMonthlyCostUsd: number | null;
  compare: {
    requestsDeltaPct: number | null;
    costDeltaPct: number | null;
    tokensDeltaPct: number | null;
    successRateDeltaPts: number | null;
    avgLatencyDeltaMs: number | null;
    failedDeltaPct: number | null;
  };
  capped: boolean;
  rowCountLoaded: number;
};

export type AiApisChartPoint = { date: string; current: number; previous: number };

export type AiApisFeatureSlice = { feature: string; count: number; pct: number };

export type AiApisOrgCostBar = {
  organizationId: string | null;
  organizationName: string;
  costUsd: number;
};

export type AiApisFilterOptions = {
  organizations: Array<{ id: string; name: string }>;
  features: string[];
  models: string[];
  providers: string[];
};

type RawAiRow = {
  id: string;
  request_id: string;
  created_at: string;
  organization_id: string | null;
  user_id: string | null;
  event_id: string | null;
  feature: string;
  action_type: string;
  provider: string;
  model: string;
  environment: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  image_units: number | string | null;
  estimated_cost_usd: number | string | null;
  latency_ms: number | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  channel: string | null;
};

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function previousWindow(fromIso: string, toIso: string): {
  fromIso: string;
  toIso: string;
} {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const span = Math.max(0, to - from);
  return {
    fromIso: new Date(from - span).toISOString(),
    toIso: new Date(from).toISOString(),
  };
}

function matchesSearch(row: RawAiRow, search: string | null | undefined): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.request_id,
    row.feature,
    row.action_type,
    row.model,
    row.provider,
    row.organization_id ?? "",
    row.user_id ?? "",
    row.error_code ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function applyFilters(rows: RawAiRow[], filters: AiApisFilters): RawAiRow[] {
  return rows.filter((row) => {
    if (filters.organizationId && row.organization_id !== filters.organizationId) {
      return false;
    }
    if (filters.feature && row.feature !== filters.feature) return false;
    if (filters.model && row.model !== filters.model) return false;
    if (filters.provider && row.provider !== filters.provider) return false;
    if (filters.status === "success" && !row.success) return false;
    if (filters.status === "failed" && row.success) return false;
    if (!matchesSearch(row, filters.search)) return false;
    return true;
  });
}

async function fetchAiRowsInRange(input: {
  fromIso: string;
  toIso: string;
  limit: number;
}): Promise<{ rows: RawAiRow[]; capped: boolean }> {
  if (!isSupabaseAdminConfigured()) {
    return { rows: [], capped: false };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_log")
    .select(
      "id, request_id, created_at, organization_id, user_id, event_id, feature, action_type, provider, model, environment, prompt_tokens, completion_tokens, total_tokens, image_units, estimated_cost_usd, latency_ms, success, error_code, error_message, channel",
    )
    .gte("created_at", input.fromIso)
    .lt("created_at", input.toIso)
    .order("created_at", { ascending: false })
    .limit(input.limit);

  if (error) {
    console.error("[ai-apis] fetch ai_usage_log failed:", error.message);
    return { rows: [], capped: false };
  }

  const rows = (data ?? []) as RawAiRow[];
  return { rows, capped: rows.length >= input.limit };
}

async function resolveOrgNames(
  organizationIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!organizationIds.length || !isSupabaseAdminConfigured()) return map;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name")
    .in("id", organizationIds);
  if (error) {
    console.error("[ai-apis] org name lookup failed:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, (row.name as string) || "Organization");
  }
  return map;
}

async function resolveUserLabels(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length || !isSupabaseAdminConfigured()) return map;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_users")
    .select("user_id, email")
    .in("user_id", userIds)
    .limit(500);
  if (error) {
    console.error("[ai-apis] user label lookup failed:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const id = row.user_id as string;
    if (!id || map.has(id)) continue;
    const label = (row.email as string | null)?.trim() || id.slice(0, 8);
    map.set(id, label);
  }
  return map;
}

function summarize(rows: RawAiRow[], rangeDays: number): Omit<
  AiApisSummary,
  "compare" | "capped" | "rowCountLoaded"
> {
  const requests = rows.length;
  let totalCostUsd = 0;
  let totalTokens = 0;
  let successCount = 0;
  let latencySum = 0;
  let latencyCount = 0;
  const costByOrg = new Map<string, number>();

  for (const row of rows) {
    const cost = num(row.estimated_cost_usd) ?? 0;
    totalCostUsd += cost;
    const tokens = num(row.total_tokens);
    if (tokens != null) totalTokens += tokens;
    if (row.success) successCount += 1;
    const latency = num(row.latency_ms);
    if (latency != null) {
      latencySum += latency;
      latencyCount += 1;
    }
    if (row.organization_id) {
      costByOrg.set(
        row.organization_id,
        (costByOrg.get(row.organization_id) ?? 0) + cost,
      );
    }
  }

  const failedRequests = requests - successCount;
  const orgsNearLimit = [...costByOrg.values()].filter(
    (cost) => cost >= AI_ORGS_NEAR_LIMIT_USD,
  ).length;
  const days = Math.max(1, rangeDays);
  const estMonthlyCostUsd =
    requests === 0 ? null : (totalCostUsd / days) * 30;

  return {
    requests,
    totalCostUsd,
    totalTokens,
    successRate: requests === 0 ? null : (successCount / requests) * 100,
    avgLatencyMs: latencyCount === 0 ? null : latencySum / latencyCount,
    failedRequests,
    orgsNearLimit,
    estMonthlyCostUsd,
  };
}

function toAiUsageRow(
  row: RawAiRow,
  orgNames: Map<string, string>,
  userLabels: Map<string, string>,
): AiUsageRow {
  return {
    id: row.id,
    requestId: row.request_id,
    createdAt: row.created_at,
    organizationId: row.organization_id,
    organizationName: row.organization_id
      ? orgNames.get(row.organization_id) ?? "Unknown org"
      : null,
    userId: row.user_id,
    userLabel: row.user_id
      ? userLabels.get(row.user_id) ?? row.user_id.slice(0, 8)
      : null,
    eventId: row.event_id,
    feature: row.feature,
    actionType: row.action_type,
    provider: row.provider,
    model: row.model,
    environment: row.environment,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    imageUnits: num(row.image_units),
    estimatedCostUsd: num(row.estimated_cost_usd),
    latencyMs: row.latency_ms,
    success: row.success,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    channel: row.channel,
  };
}

export function defaultAiApisRange(): { fromIso: string; toIso: string } {
  const to = new Date();
  const from = new Date(to);
  // 90 days so one-time OpenAI history import (pre–collecting-since) is visible.
  from.setUTCDate(from.getUTCDate() - 90);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

export async function getAiApisDashboard(filters: AiApisFilters): Promise<{
  summary: AiApisSummary;
  series: AiApisChartPoint[];
  byFeature: AiApisFeatureSlice[];
  byOrgCost: AiApisOrgCostBar[];
  rows: AiUsageRow[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  filterOptions: AiApisFilterOptions;
}> {
  const pageSize = filters.pageSize ?? AI_APIS_TABLE_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const sortKey = filters.sortKey ?? "created_at";
  const sortDir = filters.sortDir ?? "desc";

  const currentFetch = await fetchAiRowsInRange({
    fromIso: filters.fromIso,
    toIso: filters.toIso,
    limit: AI_APIS_AGGREGATE_ROW_CAP,
  });
  const prev = previousWindow(filters.fromIso, filters.toIso);
  const previousFetch = await fetchAiRowsInRange({
    fromIso: prev.fromIso,
    toIso: prev.toIso,
    limit: AI_APIS_AGGREGATE_ROW_CAP,
  });

  const currentFiltered = applyFilters(currentFetch.rows, filters);
  const previousFiltered = applyFilters(previousFetch.rows, {
    ...filters,
    fromIso: prev.fromIso,
    toIso: prev.toIso,
  });

  const rangeMs =
    new Date(filters.toIso).getTime() - new Date(filters.fromIso).getTime();
  const rangeDays = Math.max(1, rangeMs / (24 * 60 * 60 * 1000));

  const currentSummary = summarize(currentFiltered, rangeDays);
  const previousSummary = summarize(previousFiltered, rangeDays);

  const summary: AiApisSummary = {
    ...currentSummary,
    capped: currentFetch.capped,
    rowCountLoaded: currentFetch.rows.length,
    compare: {
      requestsDeltaPct: pctDelta(
        currentSummary.requests,
        previousSummary.requests,
      ),
      costDeltaPct: pctDelta(
        currentSummary.totalCostUsd,
        previousSummary.totalCostUsd,
      ),
      tokensDeltaPct: pctDelta(
        currentSummary.totalTokens,
        previousSummary.totalTokens,
      ),
      successRateDeltaPts:
        currentSummary.successRate == null || previousSummary.successRate == null
          ? null
          : currentSummary.successRate - previousSummary.successRate,
      avgLatencyDeltaMs:
        currentSummary.avgLatencyMs == null ||
        previousSummary.avgLatencyMs == null
          ? null
          : currentSummary.avgLatencyMs - previousSummary.avgLatencyMs,
      failedDeltaPct: pctDelta(
        currentSummary.failedRequests,
        previousSummary.failedRequests,
      ),
    },
  };

  const currentByDay = new Map<string, number>();
  for (const row of currentFiltered) {
    const key = dayKey(row.created_at);
    currentByDay.set(key, (currentByDay.get(key) ?? 0) + 1);
  }
  const previousByDay = new Map<string, number>();
  for (const row of previousFiltered) {
    const key = dayKey(row.created_at);
    previousByDay.set(key, (previousByDay.get(key) ?? 0) + 1);
  }

  const series: AiApisChartPoint[] = [];
  const cursor = new Date(filters.fromIso);
  const end = new Date(filters.toIso);
  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10);
    const prevDate = new Date(cursor);
    prevDate.setUTCDate(prevDate.getUTCDate() - Math.round(rangeDays));
    const prevKey = prevDate.toISOString().slice(0, 10);
    series.push({
      date: key,
      current: currentByDay.get(key) ?? 0,
      previous: previousByDay.get(prevKey) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const featureCounts = new Map<string, number>();
  for (const row of currentFiltered) {
    featureCounts.set(row.feature, (featureCounts.get(row.feature) ?? 0) + 1);
  }
  const featureTotal = currentFiltered.length || 1;
  const byFeature: AiApisFeatureSlice[] = [...featureCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([feature, count]) => ({
      feature,
      count,
      pct: (count / featureTotal) * 100,
    }));

  const orgCost = new Map<string | null, number>();
  for (const row of currentFiltered) {
    const key = row.organization_id;
    orgCost.set(key, (orgCost.get(key) ?? 0) + (num(row.estimated_cost_usd) ?? 0));
  }

  for (const pinned of AI_APIS_PINNED_ORGANIZATIONS) {
    if (!orgCost.has(pinned.id)) {
      orgCost.set(pinned.id, 0);
    }
  }

  const orgIds = [
    ...new Set(
      [
        ...currentFiltered.map((r) => r.organization_id),
        ...[...orgCost.keys()],
        ...AI_APIS_PINNED_ORGANIZATIONS.map((org) => org.id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const userIds = [
    ...new Set(
      currentFiltered
        .map((r) => r.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ].slice(0, 200);

  const [orgNames, userLabels] = await Promise.all([
    resolveOrgNames(orgIds),
    resolveUserLabels(userIds),
  ]);

  for (const pinned of AI_APIS_PINNED_ORGANIZATIONS) {
    if (!orgNames.has(pinned.id)) {
      orgNames.set(pinned.id, pinned.name);
    }
  }

  const byOrgCost: AiApisOrgCostBar[] = [...orgCost.entries()]
    .map(([organizationId, costUsd]) => ({
      organizationId,
      organizationName: organizationId
        ? orgNames.get(organizationId) ?? "Unknown org"
        : "No organization",
      costUsd,
    }))
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 12);

  const sorted = [...currentFiltered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av =
      sortKey === "estimated_cost_usd"
        ? num(a.estimated_cost_usd) ?? -1
        : sortKey === "total_tokens"
          ? a.total_tokens ?? -1
          : sortKey === "latency_ms"
            ? a.latency_ms ?? -1
            : sortKey === "feature"
              ? a.feature
              : sortKey === "model"
                ? a.model
                : sortKey === "success"
                  ? a.success
                    ? 1
                    : 0
                  : a.created_at;
    const bv =
      sortKey === "estimated_cost_usd"
        ? num(b.estimated_cost_usd) ?? -1
        : sortKey === "total_tokens"
          ? b.total_tokens ?? -1
          : sortKey === "latency_ms"
            ? b.latency_ms ?? -1
            : sortKey === "feature"
              ? b.feature
              : sortKey === "model"
                ? b.model
                : sortKey === "success"
                  ? b.success
                    ? 1
                    : 0
                  : b.created_at;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize).map((row) =>
    toAiUsageRow(row, orgNames, userLabels),
  );

  const organizationOptions = new Map<string, string>();
  for (const pinned of AI_APIS_PINNED_ORGANIZATIONS) {
    organizationOptions.set(pinned.id, pinned.name);
  }
  for (const id of orgIds) {
    organizationOptions.set(id, orgNames.get(id) ?? id.slice(0, 8));
  }

  const filterOptions: AiApisFilterOptions = {
    organizations: [...organizationOptions.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    features: [...new Set(currentFetch.rows.map((r) => r.feature))].sort(),
    models: [...new Set(currentFetch.rows.map((r) => r.model))].sort(),
    providers: [...new Set(currentFetch.rows.map((r) => r.provider))].sort(),
  };

  return {
    summary,
    series,
    byFeature,
    byOrgCost,
    rows: pageRows,
    totalFiltered: currentFiltered.length,
    page,
    pageSize,
    filterOptions,
  };
}

export async function exportAiApisCsvRows(
  filters: AiApisFilters,
): Promise<AiUsageRow[]> {
  const fetch = await fetchAiRowsInRange({
    fromIso: filters.fromIso,
    toIso: filters.toIso,
    limit: AI_APIS_CSV_EXPORT_CAP,
  });
  const filtered = applyFilters(fetch.rows, filters).slice(
    0,
    AI_APIS_CSV_EXPORT_CAP,
  );
  const orgIds = [
    ...new Set(
      filtered
        .map((r) => r.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const userIds = [
    ...new Set(
      filtered.map((r) => r.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const [orgNames, userLabels] = await Promise.all([
    resolveOrgNames(orgIds),
    resolveUserLabels(userIds),
  ]);
  return filtered.map((row) => toAiUsageRow(row, orgNames, userLabels));
}
