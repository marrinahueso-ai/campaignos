import "server-only";

import { isEmailConfigured } from "@/lib/email/send";
import {
  AI_APIS_AGGREGATE_ROW_CAP,
  AI_APIS_CONNECTED_PROVIDERS,
  AI_APIS_CSV_EXPORT_CAP,
  AI_APIS_TABLE_PAGE_SIZE,
} from "@/lib/ops/ai-apis-constants";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export type ConnectedProviderId =
  (typeof AI_APIS_CONNECTED_PROVIDERS)[number];

export type ConnectedHealthStatus =
  | "healthy"
  | "attention"
  | "no_data"
  | "not_instrumented"
  | "config_only";

export type ConnectedApisFilters = {
  fromIso: string;
  toIso: string;
  search?: string | null;
  organizationId?: string | null;
  provider?: string | null;
  status?: "success" | "failed" | null;
  page?: number;
  pageSize?: number;
  sortKey?: "created_at" | "latency_ms" | "estimated_cost_usd" | "provider" | "success";
  sortDir?: "asc" | "desc";
};

export type ApiUsageRow = {
  id: string;
  requestId: string;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  userId: string | null;
  provider: string;
  operation: string;
  environment: string;
  httpStatus: number | null;
  success: boolean;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type ConnectedProviderRollup = {
  provider: ConnectedProviderId;
  instrumented: boolean;
  requests: number;
  successes: number;
  failures: number;
  avgLatencyMs: number | null;
  totalCostUsd: number | null;
  health: ConnectedHealthStatus;
  healthDetail: string;
};

export type ConnectedApisSummary = {
  totalRequests: number;
  failedRequests: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  totalCostUsd: number;
  providersWithTraffic: number;
  capped: boolean;
};

export type ConnectedApisFilterOptions = {
  organizations: Array<{ id: string; name: string }>;
  providers: string[];
};

type RawApiRow = {
  id: string;
  request_id: string;
  created_at: string;
  organization_id: string | null;
  user_id: string | null;
  provider: string;
  operation: string;
  environment: string;
  http_status: number | null;
  success: boolean;
  latency_ms: number | null;
  estimated_cost_usd: number | string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

const INSTRUMENTED: ReadonlySet<string> = new Set([
  "meta",
  "resend",
  "google",
  "signupgenius",
]);

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function matchesSearch(row: RawApiRow, search: string | null | undefined): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.request_id,
    row.provider,
    row.operation,
    row.organization_id ?? "",
    row.error_code ?? "",
    row.error_message ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function applyFilters(rows: RawApiRow[], filters: ConnectedApisFilters): RawApiRow[] {
  return rows.filter((row) => {
    if (filters.organizationId && row.organization_id !== filters.organizationId) {
      return false;
    }
    if (filters.provider && row.provider !== filters.provider) return false;
    if (filters.status === "success" && !row.success) return false;
    if (filters.status === "failed" && row.success) return false;
    if (!matchesSearch(row, filters.search)) return false;
    return true;
  });
}

async function fetchApiRowsInRange(input: {
  fromIso: string;
  toIso: string;
  limit: number;
}): Promise<{ rows: RawApiRow[]; capped: boolean }> {
  if (!isSupabaseAdminConfigured()) {
    return { rows: [], capped: false };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_usage_log")
    .select(
      "id, request_id, created_at, organization_id, user_id, provider, operation, environment, http_status, success, latency_ms, estimated_cost_usd, error_code, error_message, metadata",
    )
    .gte("created_at", input.fromIso)
    .lt("created_at", input.toIso)
    .order("created_at", { ascending: false })
    .limit(input.limit);

  if (error) {
    console.error("[connected-apis] fetch api_usage_log failed:", error.message);
    return { rows: [], capped: false };
  }
  const rows = (data ?? []) as RawApiRow[];
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
    console.error("[connected-apis] org name lookup failed:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id as string, (row.name as string) || "Organization");
  }
  return map;
}

async function loadProviderHealth(): Promise<
  Map<ConnectedProviderId, { health: ConnectedHealthStatus; detail: string }>
> {
  const map = new Map<
    ConnectedProviderId,
    { health: ConnectedHealthStatus; detail: string }
  >();

  map.set("microsoft", {
    health: "not_instrumented",
    detail: "No Microsoft Graph client in product yet",
  });
  map.set("stripe", {
    health: "not_instrumented",
    detail: "Billing / Stripe calls not wired yet",
  });
  map.set("supabase", {
    health: isSupabaseAdminConfigured() ? "config_only" : "attention",
    detail: isSupabaseAdminConfigured()
      ? "Admin client configured — no per-query volume logging"
      : "Service role not configured",
  });
  map.set("resend", {
    health: isEmailConfigured() ? "healthy" : "attention",
    detail: isEmailConfigured()
      ? "RESEND_API_KEY configured"
      : "RESEND_API_KEY missing",
  });

  if (!isSupabaseAdminConfigured()) {
    for (const provider of ["meta", "google", "signupgenius"] as const) {
      map.set(provider, {
        health: "attention",
        detail: "Admin client not configured — cannot read health signals",
      });
    }
    return map;
  }

  const admin = createAdminClient();
  const now = Date.now();

  const [metaConnections, lastSync, googleConnections] = await Promise.all([
    admin
      .from("organization_meta_connections")
      .select("organization_id, token_expires_at")
      .limit(500),
    admin
      .from("analytics_sync_runs")
      .select("status, completed_at, error_message, started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("organization_google_calendar_connections")
      .select("organization_id, token_expires_at, updated_at")
      .limit(500),
  ]);

  const metaRows = metaConnections.data ?? [];
  if (metaConnections.error) {
    map.set("meta", {
      health: "attention",
      detail: "Could not read Meta connections",
    });
  } else if (metaRows.length === 0) {
    map.set("meta", {
      health: "no_data",
      detail: "No Meta connections on platform",
    });
  } else {
    const expiries = metaRows
      .map((row) => row.token_expires_at as string | null)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));
    const earliest = expiries.length ? Math.min(...expiries) : null;
    const sync = lastSync.data;
    if (earliest != null && earliest < now) {
      map.set("meta", {
        health: "attention",
        detail: "At least one page token is expired",
      });
    } else if (sync?.status === "failed") {
      map.set("meta", {
        health: "attention",
        detail: sync.error_message
          ? `Last insights sync failed: ${String(sync.error_message).slice(0, 120)}`
          : "Last insights sync failed",
      });
    } else if (sync?.status === "completed") {
      map.set("meta", {
        health: "healthy",
        detail: sync.completed_at
          ? `Last insights sync completed ${new Date(sync.completed_at).toLocaleString()}`
          : "Last insights sync completed",
      });
    } else if (earliest != null) {
      const days = Math.round((earliest - now) / (24 * 60 * 60 * 1000));
      map.set("meta", {
        health: days <= 7 ? "attention" : "healthy",
        detail:
          days <= 7
            ? `Nearest token expires in ~${days} day(s)`
            : `${metaRows.length} Meta connection(s); nearest token healthy`,
      });
    } else {
      map.set("meta", {
        health: "no_data",
        detail: `${metaRows.length} Meta connection(s); no token expiry on file`,
      });
    }
  }

  const googleRows = googleConnections.data ?? [];
  if (googleConnections.error) {
    map.set("google", {
      health: "attention",
      detail: "Could not read Google Calendar connections",
    });
  } else if (googleRows.length === 0) {
    map.set("google", {
      health: "no_data",
      detail: "No Google Calendar connections on platform",
    });
  } else {
    const expired = googleRows.some((row) => {
      const expires = row.token_expires_at
        ? new Date(row.token_expires_at as string).getTime()
        : NaN;
      return Number.isFinite(expires) && expires < now;
    });
    map.set("google", {
      health: expired ? "attention" : "healthy",
      detail: expired
        ? "At least one Google token is expired"
        : `${googleRows.length} Google Calendar connection(s)`,
    });
  }

  map.set("signupgenius", {
    health: "no_data",
    detail: "Health from import outcomes in usage log (no global connection table)",
  });

  return map;
}

function toApiUsageRow(
  row: RawApiRow,
  orgNames: Map<string, string>,
): ApiUsageRow {
  return {
    id: row.id,
    requestId: row.request_id,
    createdAt: row.created_at,
    organizationId: row.organization_id,
    organizationName: row.organization_id
      ? orgNames.get(row.organization_id) ?? "Unknown org"
      : null,
    userId: row.user_id,
    provider: row.provider,
    operation: row.operation,
    environment: row.environment,
    httpStatus: row.http_status,
    success: row.success,
    latencyMs: row.latency_ms,
    estimatedCostUsd: num(row.estimated_cost_usd),
    errorCode: row.error_code,
    errorMessage: row.error_message,
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

export async function getConnectedApisDashboard(
  filters: ConnectedApisFilters,
): Promise<{
  summary: ConnectedApisSummary;
  providers: ConnectedProviderRollup[];
  rows: ApiUsageRow[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  filterOptions: ConnectedApisFilterOptions;
}> {
  const pageSize = filters.pageSize ?? AI_APIS_TABLE_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const sortKey = filters.sortKey ?? "created_at";
  const sortDir = filters.sortDir ?? "desc";

  const [{ rows: rawRows, capped }, healthMap] = await Promise.all([
    fetchApiRowsInRange({
      fromIso: filters.fromIso,
      toIso: filters.toIso,
      limit: AI_APIS_AGGREGATE_ROW_CAP,
    }),
    loadProviderHealth(),
  ]);

  const filtered = applyFilters(rawRows, filters);

  let totalCostUsd = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let successCount = 0;
  const byProvider = new Map<
    string,
    { requests: number; successes: number; latencySum: number; latencyCount: number; cost: number }
  >();

  for (const row of filtered) {
    const cost = num(row.estimated_cost_usd) ?? 0;
    totalCostUsd += cost;
    if (row.success) successCount += 1;
    const latency = num(row.latency_ms);
    if (latency != null) {
      latencySum += latency;
      latencyCount += 1;
    }
    const bucket = byProvider.get(row.provider) ?? {
      requests: 0,
      successes: 0,
      latencySum: 0,
      latencyCount: 0,
      cost: 0,
    };
    bucket.requests += 1;
    if (row.success) bucket.successes += 1;
    bucket.cost += cost;
    if (latency != null) {
      bucket.latencySum += latency;
      bucket.latencyCount += 1;
    }
    byProvider.set(row.provider, bucket);
  }

  const providers: ConnectedProviderRollup[] = AI_APIS_CONNECTED_PROVIDERS.map(
    (provider) => {
      const stats = byProvider.get(provider);
      const health = healthMap.get(provider) ?? {
        health: "no_data" as const,
        detail: "No health signal",
      };
      const instrumented = INSTRUMENTED.has(provider);
      let resolvedHealth = health.health;
      let detail = health.detail;

      if (!instrumented && provider !== "supabase") {
        resolvedHealth = "not_instrumented";
      } else if (
        instrumented &&
        (!stats || stats.requests === 0) &&
        resolvedHealth === "healthy"
      ) {
        // Keep connection health, but note no traffic in range.
        detail = `${detail} · No requests in selected range`;
      } else if (
        instrumented &&
        stats &&
        stats.requests > 0 &&
        stats.successes / stats.requests < 0.9
      ) {
        resolvedHealth = "attention";
        detail = `High failure rate in range (${stats.requests - stats.successes}/${stats.requests} failed)`;
      }

      return {
        provider,
        instrumented: instrumented || provider === "supabase",
        requests: stats?.requests ?? 0,
        successes: stats?.successes ?? 0,
        failures: stats ? stats.requests - stats.successes : 0,
        avgLatencyMs:
          stats && stats.latencyCount > 0
            ? stats.latencySum / stats.latencyCount
            : null,
        totalCostUsd: stats && stats.cost > 0 ? stats.cost : null,
        health: resolvedHealth,
        healthDetail: detail,
      };
    },
  );

  const summary: ConnectedApisSummary = {
    totalRequests: filtered.length,
    failedRequests: filtered.length - successCount,
    successRate:
      filtered.length === 0 ? null : (successCount / filtered.length) * 100,
    avgLatencyMs: latencyCount === 0 ? null : latencySum / latencyCount,
    totalCostUsd,
    providersWithTraffic: [...byProvider.values()].filter((b) => b.requests > 0)
      .length,
    capped,
  };

  const orgIds = [
    ...new Set(
      filtered
        .map((row) => row.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const orgNames = await resolveOrgNames(orgIds);

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av =
      sortKey === "latency_ms"
        ? a.latency_ms ?? -1
        : sortKey === "estimated_cost_usd"
          ? num(a.estimated_cost_usd) ?? -1
          : sortKey === "provider"
            ? a.provider
            : sortKey === "success"
              ? a.success
                ? 1
                : 0
              : a.created_at;
    const bv =
      sortKey === "latency_ms"
        ? b.latency_ms ?? -1
        : sortKey === "estimated_cost_usd"
          ? num(b.estimated_cost_usd) ?? -1
          : sortKey === "provider"
            ? b.provider
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
  const pageRows = sorted
    .slice(start, start + pageSize)
    .map((row) => toApiUsageRow(row, orgNames));

  return {
    summary,
    providers,
    rows: pageRows,
    totalFiltered: filtered.length,
    page,
    pageSize,
    filterOptions: {
      organizations: orgIds
        .map((id) => ({ id, name: orgNames.get(id) ?? id.slice(0, 8) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      providers: [...new Set(rawRows.map((row) => row.provider))].sort(),
    },
  };
}

export async function exportConnectedApisCsvRows(
  filters: ConnectedApisFilters,
): Promise<ApiUsageRow[]> {
  const fetch = await fetchApiRowsInRange({
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
        .map((row) => row.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const orgNames = await resolveOrgNames(orgIds);
  return filtered.map((row) => toApiUsageRow(row, orgNames));
}
