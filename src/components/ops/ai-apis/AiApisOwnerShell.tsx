"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  DollarSign,
  Download,
  Eye,
  Timer,
  X,
  Zap,
} from "lucide-react";
import {
  exportAiApisCsvAction,
  exportConnectedApisCsvAction,
  importOpenAiHistoryAction,
} from "@/lib/ops/ai-apis-actions";
import {
  AI_APIS_COLLECTING_SINCE,
  AI_APIS_RECONCILE_COST_TOLERANCE_PCT,
  AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT,
  AI_APIS_SOAK_DAYS_TARGET,
  AI_ORGS_NEAR_LIMIT_USD,
} from "@/lib/ops/ai-apis-constants";
import type {
  AiApisChartPoint,
  AiApisFeatureSlice,
  AiApisFilterOptions,
  AiApisOrgCostBar,
  AiApisSummary,
  AiUsageRow,
} from "@/lib/ops/ai-apis-queries";
import type {
  ApiUsageRow,
  ConnectedApisFilterOptions,
  ConnectedApisSummary,
  ConnectedProviderRollup,
} from "@/lib/ops/connected-apis-queries";
import { ConnectedApisPanel } from "@/components/ops/ai-apis/ConnectedApisPanel";
import { cn } from "@/lib/utils/cn";

export type AiApisTab = "ai" | "connected";

type ShellProps = {
  tab: AiApisTab;
  fromDate: string;
  toDate: string;
  search: string;
  organizationId: string;
  feature: string;
  model: string;
  provider: string;
  status: string;
  page: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  summary: AiApisSummary;
  series: AiApisChartPoint[];
  byFeature: AiApisFeatureSlice[];
  byOrgCost: AiApisOrgCostBar[];
  rows: AiUsageRow[];
  totalFiltered: number;
  pageSize: number;
  filterOptions: AiApisFilterOptions;
  openAiImportConfigured: boolean;
  connected: {
    summary: ConnectedApisSummary;
    providers: ConnectedProviderRollup[];
    rows: ApiUsageRow[];
    totalFiltered: number;
    page: number;
    pageSize: number;
    filterOptions: ConnectedApisFilterOptions;
  } | null;
};

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatDelta(
  value: number | null,
  suffix = "%",
): { text: string; tone: "up" | "down" | "neutral" } {
  if (value == null || !Number.isFinite(value)) {
    return { text: "—", tone: "neutral" };
  }
  const sign = value > 0 ? "+" : "";
  return {
    text: `${sign}${value.toFixed(1)}${suffix}`,
    tone: value > 0 ? "up" : value < 0 ? "down" : "neutral",
  };
}

function formatFeatureLabel(feature: string): string {
  return feature
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function AiApisOwnerShell(props: ShellProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<AiUsageRow | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(props.totalFiltered / props.pageSize));

  const navigate = (patch: Record<string, string | number | undefined>) => {
    const next = {
      tab: props.tab,
      from: props.fromDate,
      to: props.toDate,
      q: props.search,
      organizationId: props.organizationId,
      feature: props.feature,
      model: props.model,
      provider: props.provider,
      status: props.status,
      page: props.page,
      sort: props.sortKey,
      dir: props.sortDir,
      ...patch,
    };
    startTransition(() => {
      router.push(`/ops/ai-apis${buildQuery(next)}`);
    });
  };

  const onImportOpenAiHistory = () => {
    setImportMessage(null);
    startTransition(async () => {
      const result = await importOpenAiHistoryAction();
      if (!result.success) {
        setImportMessage(result.error);
        return;
      }
      const warn =
        result.warnings.length > 0
          ? ` Warnings: ${result.warnings.join(" ")}`
          : "";
      setImportMessage(
        `Imported ${result.inserted} OpenAI history row(s) (${result.skippedExisting} already present) across ${result.daysCovered} day(s), attributed to Edmondson Elementary. Widen From date if needed.${warn}`,
      );
      router.refresh();
    });
  };

  const onExport = () => {
    setExportMessage(null);
    startTransition(async () => {
      const status: "success" | "failed" | null =
        props.status === "success" || props.status === "failed"
          ? props.status
          : null;
      const range = {
        fromIso: new Date(`${props.fromDate}T00:00:00.000Z`).toISOString(),
        toIso: new Date(`${props.toDate}T23:59:59.999Z`).toISOString(),
        search: props.search || null,
        organizationId: props.organizationId || null,
        provider: props.provider || null,
        status,
      };
      const result =
        props.tab === "connected"
          ? await exportConnectedApisCsvAction(range)
          : await exportAiApisCsvAction({
              ...range,
              feature: props.feature || null,
              model: props.model || null,
            });
      if (!result.success) {
        setExportMessage(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${props.tab === "connected" ? "connected-apis" : "ai-apis"}-${props.fromDate}-to-${props.toDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMessage(
        result.truncated
          ? "Export capped at the row limit for accuracy/performance."
          : "CSV downloaded.",
      );
    });
  };

  const empty = props.summary.requests === 0;
  const connectedEmpty = (props.connected?.summary.totalRequests ?? 0) === 0;

  return (
    <div className={cn("studio-page space-y-6 pb-12", pending && "opacity-80")}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cos-muted">
            Owner
          </p>
          <h1 className="mt-2 font-serif text-3xl text-cos-text md:text-4xl">
            AI &amp; APIs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-cos-muted">
            Monitor AI activity, connected API usage, operating costs, and
            customer consumption.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-cos-muted">
            From
            <input
              type="date"
              defaultValue={props.fromDate}
              className="mt-1 block rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
              onChange={(event) =>
                navigate({ from: event.target.value, page: 1 })
              }
            />
          </label>
          <label className="text-xs text-cos-muted">
            To
            <input
              type="date"
              defaultValue={props.toDate}
              className="mt-1 block rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
              onChange={(event) => navigate({ to: event.target.value, page: 1 })}
            />
          </label>
          {props.tab === "ai" ? (
            <button
              type="button"
              onClick={onImportOpenAiHistory}
              disabled={!props.openAiImportConfigured || pending}
              title={
                props.openAiImportConfigured
                  ? "One-time pull of OpenAI Usage API history before collecting-since (Edmondson)"
                  : "Set OPENAI_ADMIN_KEY (Admin key with api.usage.read) on the server"
              }
              className="inline-flex items-center gap-2 rounded-lg border border-cos-border bg-cos-card px-4 py-2 text-sm font-medium text-cos-text disabled:opacity-40"
            >
              Import OpenAI history
            </button>
          ) : null}
          <button
            type="button"
            onClick={onExport}
            disabled={
              props.tab === "ai" ? empty : connectedEmpty || !props.connected
            }
            className="inline-flex items-center gap-2 rounded-lg bg-cos-dark px-4 py-2 text-sm font-medium text-[#f6f2eb] disabled:opacity-40"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Export
          </button>
        </div>
      </header>

      {exportMessage ? (
        <p className="text-sm text-cos-muted" role="status">
          {exportMessage}
        </p>
      ) : null}
      {importMessage ? (
        <p className="text-sm text-cos-muted" role="status">
          {importMessage}
        </p>
      ) : null}

      <div className="flex gap-6 border-b border-cos-border">
        <TabLink
          active={props.tab === "ai"}
          href={`/ops/ai-apis${buildQuery({
            tab: "ai",
            from: props.fromDate,
            to: props.toDate,
          })}`}
          label="AI APIs"
        />
        <TabLink
          active={props.tab === "connected"}
          href={`/ops/ai-apis${buildQuery({
            tab: "connected",
            from: props.fromDate,
            to: props.toDate,
          })}`}
          label="Connected APIs"
        />
      </div>

      <AccuracyLockNote
        tab={props.tab}
        aiRequests={props.summary.requests}
        connectedRequests={props.connected?.summary.totalRequests ?? 0}
        aiCapped={props.summary.capped}
        connectedCapped={props.connected?.summary.capped ?? false}
      />

      {props.tab === "connected" ? (
        props.connected ? (
          <ConnectedApisPanel
            fromDate={props.fromDate}
            toDate={props.toDate}
            search={props.search}
            organizationId={props.organizationId}
            provider={props.provider}
            status={props.status}
            page={props.connected.page}
            sortKey={props.sortKey}
            sortDir={props.sortDir}
            summary={props.connected.summary}
            providers={props.connected.providers}
            rows={props.connected.rows}
            totalFiltered={props.connected.totalFiltered}
            pageSize={props.connected.pageSize}
            filterOptions={props.connected.filterOptions}
            onNavigate={navigate}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-6 py-12 text-center text-sm text-cos-muted">
            Could not load connected API data.
          </div>
        )
      ) : (
        <>
          <FilterBar {...props} onNavigate={navigate} />

          {empty ? (
            <EmptyState capped={props.summary.capped} />
          ) : (
            <>
              <SummaryCards summary={props.summary} />
              {props.summary.capped ? (
                <p className="text-xs text-cos-muted">
                  Aggregates use the most recent loaded rows in range (cap
                  reached). Narrow filters for full accuracy.
                </p>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-3">
                <RequestsOverTime series={props.series} />
                <FeatureDonut slices={props.byFeature} />
                <OrgCostBars bars={props.byOrgCost} />
              </div>
              <RequestsTable
                rows={props.rows}
                page={props.page}
                totalPages={totalPages}
                totalFiltered={props.totalFiltered}
                sortKey={props.sortKey}
                sortDir={props.sortDir}
                onSort={(key) =>
                  navigate({
                    sort: key,
                    dir:
                      props.sortKey === key && props.sortDir === "desc"
                        ? "asc"
                        : "desc",
                    page: 1,
                  })
                }
                onPage={(page) => navigate({ page })}
                onOpen={setSelected}
              />
            </>
          )}
        </>
      )}

      {selected ? (
        <RequestDetailsDrawer row={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function TabLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border-b-2 pb-3 text-sm font-medium transition-colors",
        active
          ? "border-cos-dark text-cos-text"
          : "border-transparent text-cos-muted hover:text-cos-text",
      )}
    >
      {label}
    </Link>
  );
}

function FilterBar({
  search,
  organizationId,
  feature,
  model,
  provider,
  status,
  filterOptions,
  onNavigate,
}: ShellProps & { onNavigate: (patch: Record<string, string | number | undefined>) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
      <input
        type="search"
        defaultValue={search}
        placeholder="Search organizations, users, features, models, request IDs…"
        className="w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onNavigate({
              q: (event.target as HTMLInputElement).value,
              page: 1,
            });
          }
        }}
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SelectFilter
          label="Organizations"
          value={organizationId}
          options={filterOptions.organizations.map((o) => ({
            value: o.id,
            label: o.name,
          }))}
          onChange={(value) => onNavigate({ organizationId: value, page: 1 })}
        />
        <SelectFilter
          label="Features"
          value={feature}
          options={filterOptions.features.map((f) => ({
            value: f,
            label: formatFeatureLabel(f),
          }))}
          onChange={(value) => onNavigate({ feature: value, page: 1 })}
        />
        <SelectFilter
          label="Models"
          value={model}
          options={filterOptions.models.map((m) => ({ value: m, label: m }))}
          onChange={(value) => onNavigate({ model: value, page: 1 })}
        />
        <SelectFilter
          label="Providers"
          value={provider}
          options={filterOptions.providers.map((p) => ({ value: p, label: p }))}
          onChange={(value) => onNavigate({ provider: value, page: 1 })}
        />
        <SelectFilter
          label="Status"
          value={status}
          options={[
            { value: "success", label: "Success" },
            { value: "failed", label: "Failed" },
          ]}
          onChange={(value) => onNavigate({ status: value, page: 1 })}
        />
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-cos-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryCards({ summary }: { summary: AiApisSummary }) {
  const cards = [
    {
      label: "AI Requests",
      value: summary.requests.toLocaleString(),
      delta: formatDelta(summary.compare.requestsDeltaPct),
      icon: Activity,
    },
    {
      label: "Total AI Cost",
      value: formatMoney(summary.totalCostUsd),
      delta: formatDelta(summary.compare.costDeltaPct),
      icon: DollarSign,
    },
    {
      label: "Total Tokens",
      value: formatTokens(summary.totalTokens),
      delta: formatDelta(summary.compare.tokensDeltaPct),
      icon: Cpu,
    },
    {
      label: "Success Rate",
      value:
        summary.successRate == null ? "—" : `${summary.successRate.toFixed(1)}%`,
      delta: formatDelta(summary.compare.successRateDeltaPts, " pts"),
      icon: Zap,
    },
    {
      label: "Avg. Response Time",
      value:
        summary.avgLatencyMs == null
          ? "—"
          : `${(summary.avgLatencyMs / 1000).toFixed(2)}s`,
      delta:
        summary.compare.avgLatencyDeltaMs == null
          ? { text: "—", tone: "neutral" as const }
          : {
              text: `${summary.compare.avgLatencyDeltaMs >= 0 ? "+" : ""}${(summary.compare.avgLatencyDeltaMs / 1000).toFixed(2)}s`,
              tone:
                summary.compare.avgLatencyDeltaMs > 0
                  ? ("up" as const)
                  : summary.compare.avgLatencyDeltaMs < 0
                    ? ("down" as const)
                    : ("neutral" as const),
            },
      icon: Timer,
    },
    {
      label: "Failed Requests",
      value: summary.failedRequests.toLocaleString(),
      delta: formatDelta(summary.compare.failedDeltaPct),
      icon: AlertTriangle,
    },
    {
      label: "Orgs Near Limit",
      value: summary.orgsNearLimit.toLocaleString(),
      delta: {
        text: `≥ $${AI_ORGS_NEAR_LIMIT_USD}`,
        tone: "neutral" as const,
      },
      icon: AlertTriangle,
    },
    {
      label: "Est. Monthly Cost",
      value: formatMoney(summary.estMonthlyCostUsd),
      delta: { text: "Projected", tone: "neutral" as const },
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
              {card.label}
            </p>
            <card.icon className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
          </div>
          <p className="mt-2 font-serif text-2xl text-cos-text tabular-nums">
            {card.value}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              card.delta.tone === "up" && "text-cos-success-text",
              card.delta.tone === "down" && "text-cos-error-text",
              card.delta.tone === "neutral" && "text-cos-muted",
            )}
          >
            {card.delta.text}
            {card.delta.tone !== "neutral" ? " vs prior" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function RequestsOverTime({ series }: { series: AiApisChartPoint[] }) {
  const max = Math.max(1, ...series.flatMap((p) => [p.current, p.previous]));
  const width = 360;
  const height = 140;
  const toPoints = (key: "current" | "previous") =>
    series
      .map((point, index) => {
        const x = (index / Math.max(1, series.length - 1)) * width;
        const y = height - (point[key] / max) * (height - 12) - 6;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm xl:col-span-1">
      <h2 className="font-serif text-lg text-cos-text">AI requests over time</h2>
      <p className="mt-1 text-xs text-cos-muted">This period vs previous</p>
      {series.length === 0 ? (
        <p className="mt-8 text-sm text-cos-muted">No series data.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-4 h-36 w-full"
          role="img"
          aria-label="AI requests over time"
        >
          <polyline
            fill="none"
            stroke="#8b7bb8"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={toPoints("previous")}
          />
          <polyline
            fill="none"
            stroke="#2f3a4a"
            strokeWidth="2.5"
            points={toPoints("current")}
          />
        </svg>
      )}
    </div>
  );
}

const FEATURE_DONUT_COLORS = [
  "#2f3a4a",
  "#c4a35a",
  "#6b8f71",
  "#c47a5a",
  "#8b7bb8",
  "#5a7a9a",
  "#a67c52",
  "#7a7a7a",
];

function FeatureDonut({ slices }: { slices: AiApisFeatureSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  const gradient = useMemo(() => {
    if (!slices.length) return "conic-gradient(#e8e2d6 0 100%)";
    let cursor = 0;
    const parts = slices.map((slice, index) => {
      const start = cursor;
      cursor += slice.pct;
      return `${FEATURE_DONUT_COLORS[index % FEATURE_DONUT_COLORS.length]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [slices]);

  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <h2 className="font-serif text-lg text-cos-text">Requests by feature</h2>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full"
          style={{ background: gradient }}
          aria-hidden
        >
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-cos-card">
            <span className="font-serif text-xl text-cos-text tabular-nums">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
          {slices.map((slice, index) => (
            <li key={slice.feature} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-cos-text">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      FEATURE_DONUT_COLORS[index % FEATURE_DONUT_COLORS.length],
                  }}
                />
                <span className="truncate">{formatFeatureLabel(slice.feature)}</span>
              </span>
              <span className="tabular-nums text-cos-muted">
                {slice.pct.toFixed(0)}%
              </span>
            </li>
          ))}
          {!slices.length ? (
            <li className="text-cos-muted">No feature breakdown yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function OrgCostBars({ bars }: { bars: AiApisOrgCostBar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.costUsd));
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <h2 className="font-serif text-lg text-cos-text">AI cost by organization</h2>
      <ul className="mt-4 space-y-3">
        {bars.map((bar) => (
          <li key={bar.organizationId ?? "none"}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-cos-text">{bar.organizationName}</span>
              <span className="tabular-nums text-cos-muted">
                {formatMoney(bar.costUsd)}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-cos-bg">
              <div
                className="h-2 rounded-full bg-cos-brand-navy/80"
                style={{ width: `${(bar.costUsd / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
        {!bars.length ? (
          <li className="text-sm text-cos-muted">No org cost data yet.</li>
        ) : null}
      </ul>
    </div>
  );
}

function RequestsTable({
  rows,
  page,
  totalPages,
  totalFiltered,
  sortKey,
  sortDir,
  onSort,
  onPage,
  onOpen,
}: {
  rows: AiUsageRow[];
  page: number;
  totalPages: number;
  totalFiltered: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  onOpen: (row: AiUsageRow) => void;
}) {
  const SortTh = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={() => onSort(id)}
        className="font-semibold text-cos-muted hover:text-cos-text"
      >
        {label}
        {sortKey === id ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
      <div className="flex items-center justify-between border-b border-cos-border px-4 py-3">
        <h2 className="font-serif text-lg text-cos-text">Recent AI requests</h2>
        <p className="text-xs text-cos-muted">
          {totalFiltered.toLocaleString()} matching
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-cos-bg/70 text-xs uppercase tracking-wide text-cos-muted">
            <tr>
              <SortTh id="created_at" label="Date & time" />
              <th className="px-3 py-2 text-left">Organization</th>
              <th className="px-3 py-2 text-left">User</th>
              <SortTh id="feature" label="Feature" />
              <SortTh id="model" label="Model" />
              <SortTh id="total_tokens" label="Tokens" />
              <SortTh id="estimated_cost_usd" label="Cost" />
              <SortTh id="success" label="Status" />
              <SortTh id="latency_ms" label="Time" />
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-cos-border/80">
                <td className="whitespace-nowrap px-3 py-2.5 text-cos-muted">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-cos-text">
                  {row.organizationName ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-cos-muted">{row.userLabel ?? "—"}</td>
                <td className="px-3 py-2.5 text-cos-text">
                  {formatFeatureLabel(row.feature)}
                </td>
                <td className="px-3 py-2.5 text-cos-muted">{row.model}</td>
                <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                  {row.totalTokens?.toLocaleString() ?? "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-cos-text">
                  {formatMoney(row.estimatedCostUsd)}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill success={row.success} />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                  {row.latencyMs == null
                    ? "—"
                    : `${(row.latencyMs / 1000).toFixed(2)}s`}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-cos-border px-2 py-1 text-xs text-cos-text hover:bg-cos-bg"
                    aria-label={`View request ${row.requestId}`}
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-cos-border px-4 py-3 text-xs text-cos-muted">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-md border border-cos-border px-2 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded-md border border-cos-border px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ success }: { success: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        success
          ? "bg-cos-success-bg text-cos-success-text"
          : "bg-[#f3e6e1] text-cos-error-text",
      )}
    >
      {success ? "Success" : "Failed"}
    </span>
  );
}

function RequestDetailsDrawer({
  row,
  onClose,
}: {
  row: AiUsageRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button type="button" aria-label="Close drawer" className="flex-1" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-cos-border bg-cos-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-cos-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
              Request details
            </p>
            <h2 className="mt-1 break-all font-mono text-sm text-cos-text">
              {row.requestId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <Detail label="When" value={new Date(row.createdAt).toLocaleString()} />
          <Detail label="Organization" value={row.organizationName ?? "—"} />
          <Detail label="User" value={row.userLabel ?? "—"} />
          <Detail label="Feature" value={formatFeatureLabel(row.feature)} />
          <Detail label="Action" value={row.actionType} />
          <Detail label="Provider" value={row.provider} />
          <Detail label="Model" value={row.model} />
          <Detail label="Environment" value={row.environment} />
          <Detail label="Status" value={row.success ? "Success" : "Failed"} />
          <Detail
            label="Tokens"
            value={`${row.promptTokens ?? "—"} in / ${row.completionTokens ?? "—"} out / ${row.totalTokens ?? "—"} total`}
          />
          <Detail label="Image units" value={row.imageUnits?.toString() ?? "—"} />
          <Detail label="Estimated cost" value={formatMoney(row.estimatedCostUsd)} />
          <Detail
            label="Latency"
            value={
              row.latencyMs == null ? "—" : `${(row.latencyMs / 1000).toFixed(2)}s`
            }
          />
          <Detail label="Error code" value={row.errorCode ?? "—"} />
          <Detail label="Error" value={row.errorMessage ?? "—"} />
          <p className="text-xs text-cos-muted">
            Prompt and completion bodies are not stored in v1.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-cos-muted">
        {label}
      </p>
      <p className="mt-1 break-words text-cos-text">{value}</p>
    </div>
  );
}

function AccuracyLockNote({
  tab,
  aiRequests,
  connectedRequests,
  aiCapped,
  connectedCapped,
}: {
  tab: AiApisTab;
  aiRequests: number;
  connectedRequests: number;
  aiCapped: boolean;
  connectedCapped: boolean;
}) {
  const requests = tab === "ai" ? aiRequests : connectedRequests;
  const capped = tab === "ai" ? aiCapped : connectedCapped;
  return (
    <div className="rounded-xl border border-cos-border bg-cos-card/60 px-4 py-3 text-xs text-cos-muted">
      <p>
        Accuracy lock · Collecting since {AI_APIS_COLLECTING_SINCE} · Target soak{" "}
        {AI_APIS_SOAK_DAYS_TARGET} days before customer QA.
        {requests === 0
          ? " No warehouse rows in this range yet — trigger product AI/API paths or wait for production traffic."
          : null}
        {capped
          ? " Aggregate row cap reached — narrow the date range for full-period accuracy."
          : null}
      </p>
      {tab === "ai" ? (
        <p className="mt-1">
          OpenAI reconcile:{" "}
          <code className="rounded bg-cos-bg px-1 py-0.5 text-[11px] text-cos-text">
            npm run reconcile:ai-usage -- YYYY-MM-DD
          </code>{" "}
          then compare tokens (±{AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT}%) and cost (±
          {AI_APIS_RECONCILE_COST_TOLERANCE_PCT}%) to the OpenAI Usage dashboard
          (UTC day). Checklist: docs/qa/owner-ai-apis.md § F.
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({ capped }: { capped: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-6 py-12 text-center">
      <p className="font-serif text-xl text-cos-text">
        No AI usage recorded in this range
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-cos-muted">
        Collecting since {AI_APIS_COLLECTING_SINCE}. Numbers reflect durable logs
        only — no demo data.
        {capped ? " Aggregate load cap was reached for broader windows." : ""}
      </p>
    </div>
  );
}
