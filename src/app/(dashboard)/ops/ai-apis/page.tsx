import { redirect } from "next/navigation";
import { AiApisOwnerShell } from "@/components/ops/ai-apis/AiApisOwnerShell";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  defaultAiApisRange,
  getAiApisDashboard,
  type AiApisSortKey,
} from "@/lib/ops/ai-apis-queries";
import { getConnectedApisDashboard } from "@/lib/ops/connected-apis-queries";

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

  const [dashboard, connected] = await Promise.all([
    getAiApisDashboard({
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
    }),
    getConnectedApisDashboard({
      fromIso,
      toIso,
      search,
      organizationId,
      provider,
      status,
      page,
      sortKey: connectedSortKey,
      sortDir,
    }),
  ]);

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
      page={tab === "connected" ? connected.page : dashboard.page}
      sortKey={sortKey}
      sortDir={sortDir}
      summary={dashboard.summary}
      series={dashboard.series}
      byFeature={dashboard.byFeature}
      byOrgCost={dashboard.byOrgCost}
      rows={dashboard.rows}
      totalFiltered={dashboard.totalFiltered}
      pageSize={dashboard.pageSize}
      filterOptions={dashboard.filterOptions}
      connected={{
        summary: connected.summary,
        providers: connected.providers,
        rows: connected.rows,
        totalFiltered: connected.totalFiltered,
        page: connected.page,
        pageSize: connected.pageSize,
        filterOptions: connected.filterOptions,
      }}
    />
  );
}
