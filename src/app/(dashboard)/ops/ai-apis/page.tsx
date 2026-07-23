import { redirect } from "next/navigation";
import { AiApisOwnerShell } from "@/components/ops/ai-apis/AiApisOwnerShell";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  defaultAiApisRange,
  getAiApisDashboard,
  type AiApisSortKey,
} from "@/lib/ops/ai-apis-queries";

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
  const sortKey = (
    [
      "created_at",
      "estimated_cost_usd",
      "total_tokens",
      "latency_ms",
      "feature",
      "model",
      "success",
    ] as AiApisSortKey[]
  ).includes(sortRaw as AiApisSortKey)
    ? (sortRaw as AiApisSortKey)
    : "created_at";

  const statusRaw = first(params.status);
  const status =
    statusRaw === "success" || statusRaw === "failed" ? statusRaw : null;

  const dashboard = await getAiApisDashboard({
    fromIso,
    toIso,
    search: first(params.q) ?? null,
    organizationId: first(params.organizationId) ?? null,
    feature: first(params.feature) ?? null,
    model: first(params.model) ?? null,
    provider: first(params.provider) ?? null,
    status,
    page: Math.max(1, Number(first(params.page) ?? "1") || 1),
    sortKey,
    sortDir: first(params.dir) === "asc" ? "asc" : "desc",
  });

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
      page={dashboard.page}
      sortKey={sortKey}
      sortDir={first(params.dir) === "asc" ? "asc" : "desc"}
      summary={dashboard.summary}
      series={dashboard.series}
      byFeature={dashboard.byFeature}
      byOrgCost={dashboard.byOrgCost}
      rows={dashboard.rows}
      totalFiltered={dashboard.totalFiltered}
      pageSize={dashboard.pageSize}
      filterOptions={dashboard.filterOptions}
    />
  );
}
