import { redirect } from "next/navigation";
import { AiApisOwnerShell } from "@/components/ops/ai-apis/AiApisOwnerShell";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  AI_APIS_PINNED_ORGANIZATIONS,
  AI_APIS_TABLE_PAGE_SIZE,
} from "@/lib/ops/ai-apis-constants";
import {
  defaultAiApisRange,
  getAiApisDashboard,
  type AiApisFilterOptions,
  type AiApisSortKey,
  type AiApisSummary,
} from "@/lib/ops/ai-apis-queries";
import { getConnectedApisDashboard } from "@/lib/ops/connected-apis-queries";
import { isOpenAiAdminUsageConfigured } from "@/lib/ops/openai-usage-import";

export const metadata = {
  title: "AI & APIs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

const EMPTY_AI_SUMMARY: AiApisSummary = {
  requests: 0,
  totalCostUsd: 0,
  totalTokens: 0,
  successRate: null,
  avgLatencyMs: null,
  failedRequests: 0,
  orgsNearLimit: 0,
  estMonthlyCostUsd: null,
  capped: false,
  rowCountLoaded: 0,
  compare: {
    requestsDeltaPct: null,
    costDeltaPct: null,
    tokensDeltaPct: null,
    successRateDeltaPts: null,
    avgLatencyDeltaMs: null,
    failedDeltaPct: null,
  },
};

const EMPTY_AI_FILTERS: AiApisFilterOptions = {
  organizations: AI_APIS_PINNED_ORGANIZATIONS.map((org) => ({
    id: org.id,
    name: org.name,
  })),
  features: [],
  models: [],
  providers: [],
};

export default async function OwnerAiApisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await canAccessOwnerOps())) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tabRaw = first(params.tab);
  const tab = tabRaw === "connected" ? "connected" : "ai";

  const defaults = defaultAiApisRange();
  const fromDate = first(params.from) || ymd(defaults.fromIso);
  const toDate = first(params.to) || ymd(defaults.toIso);

  const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
  const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();

  const sortRaw = first(params.sort) ?? "created_at";
  const aiSortKeys: AiApisSortKey[] = [
    "created_at",
    "estimated_cost_usd",
    "total_tokens",
    "latency_ms",
    "feature",
    "model",
    "success",
  ];
  const sortKey = aiSortKeys.includes(sortRaw as AiApisSortKey)
    ? (sortRaw as AiApisSortKey)
    : "created_at";
  const connectedSortKey =
    sortRaw === "latency_ms" ||
    sortRaw === "estimated_cost_usd" ||
    sortRaw === "provider" ||
    sortRaw === "success"
      ? sortRaw
      : "created_at";

  const statusRaw = first(params.status);
  const status =
    statusRaw === "success" || statusRaw === "failed" ? statusRaw : null;

  const page = Math.max(1, Number(first(params.page) ?? "1") || 1);
  const sortDir = first(params.dir) === "asc" ? "asc" : "desc";
  const search = first(params.q) ?? null;
  const organizationId = first(params.organizationId) ?? null;
  const provider = first(params.provider) ?? null;

  // Load only the active tab (avoids double warehouse scans on Owner page).
  const dashboard =
    tab === "ai"
      ? await getAiApisDashboard({
          fromIso,
          toIso,
          search,
          organizationId,
          feature: first(params.feature) ?? null,
          model: first(params.model) ?? null,
          provider,
          status,
          page,
          sortKey,
          sortDir,
        })
      : null;
  const connected =
    tab === "connected"
      ? await getConnectedApisDashboard({
          fromIso,
          toIso,
          search,
          organizationId,
          provider,
          status,
          page,
          sortKey: connectedSortKey,
          sortDir,
        })
      : null;

  return (
    <AiApisOwnerShell
      tab={tab}
      fromDate={fromDate}
      toDate={toDate}
      search={first(params.q) ?? ""}
      organizationId={first(params.organizationId) ?? ""}
      feature={first(params.feature) ?? ""}
      model={first(params.model) ?? ""}
      provider={first(params.provider) ?? ""}
      status={status ?? ""}
      page={connected?.page ?? dashboard?.page ?? page}
      sortKey={sortKey}
      sortDir={sortDir}
      summary={dashboard?.summary ?? EMPTY_AI_SUMMARY}
      series={dashboard?.series ?? []}
      byFeature={dashboard?.byFeature ?? []}
      byOrgCost={dashboard?.byOrgCost ?? []}
      rows={dashboard?.rows ?? []}
      totalFiltered={dashboard?.totalFiltered ?? 0}
      pageSize={dashboard?.pageSize ?? AI_APIS_TABLE_PAGE_SIZE}
      filterOptions={dashboard?.filterOptions ?? EMPTY_AI_FILTERS}
      openAiImportConfigured={isOpenAiAdminUsageConfigured()}
      connected={
        connected
          ? {
              summary: connected.summary,
              providers: connected.providers,
              rows: connected.rows,
              totalFiltered: connected.totalFiltered,
              page: connected.page,
              pageSize: connected.pageSize,
              filterOptions: connected.filterOptions,
            }
          : null
      }
    />
  );
}
