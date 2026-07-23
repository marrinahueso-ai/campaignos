"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { AI_APIS_COLLECTING_SINCE } from "@/lib/ops/ai-apis-constants";
import type {
  ApiUsageRow,
  ConnectedApisFilterOptions,
  ConnectedApisSummary,
  ConnectedHealthStatus,
  ConnectedProviderRollup,
} from "@/lib/ops/connected-apis-queries";
import { cn } from "@/lib/utils/cn";

type Props = {
  fromDate: string;
  toDate: string;
  search: string;
  organizationId: string;
  provider: string;
  status: string;
  page: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  summary: ConnectedApisSummary;
  providers: ConnectedProviderRollup[];
  rows: ApiUsageRow[];
  totalFiltered: number;
  pageSize: number;
  filterOptions: ConnectedApisFilterOptions;
  onNavigate: (patch: Record<string, string | number | undefined>) => void;
};

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function healthLabel(status: ConnectedHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "attention":
      return "Needs attention";
    case "no_data":
      return "No data yet";
    case "not_instrumented":
      return "Not instrumented yet";
    case "config_only":
      return "Config only";
  }
}

function HealthPill({ status }: { status: ConnectedHealthStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "healthy" && "bg-cos-success-bg text-cos-success-text",
        status === "attention" && "bg-[#f3e6e1] text-cos-error-text",
        (status === "no_data" ||
          status === "not_instrumented" ||
          status === "config_only") &&
          "bg-cos-bg text-cos-muted",
      )}
    >
      {healthLabel(status)}
    </span>
  );
}

export function ConnectedApisPanel(props: Props) {
  const [selected, setSelected] = useState<ApiUsageRow | null>(null);
  const totalPages = Math.max(1, Math.ceil(props.totalFiltered / props.pageSize));
  const empty = props.summary.totalRequests === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
        <input
          type="search"
          defaultValue={props.search}
          placeholder="Search providers, operations, request IDs, orgs…"
          className="w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              props.onNavigate({
                q: (event.target as HTMLInputElement).value,
                page: 1,
              });
            }
          }}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-cos-muted">
            Organizations
            <select
              value={props.organizationId}
              onChange={(event) =>
                props.onNavigate({ organizationId: event.target.value, page: 1 })
              }
              className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              <option value="">All</option>
              {props.filterOptions.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cos-muted">
            Providers
            <select
              value={props.provider}
              onChange={(event) =>
                props.onNavigate({ provider: event.target.value, page: 1 })
              }
              className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              <option value="">All</option>
              {props.filterOptions.providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cos-muted">
            Status
            <select
              value={props.status}
              onChange={(event) =>
                props.onNavigate({ status: event.target.value, page: 1 })
              }
              className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="API Requests"
          value={props.summary.totalRequests.toLocaleString()}
        />
        <SummaryCard
          label="Failed"
          value={props.summary.failedRequests.toLocaleString()}
        />
        <SummaryCard
          label="Success Rate"
          value={
            props.summary.successRate == null
              ? "—"
              : `${props.summary.successRate.toFixed(1)}%`
          }
        />
        <SummaryCard
          label="Avg Latency"
          value={
            props.summary.avgLatencyMs == null
              ? "—"
              : `${(props.summary.avgLatencyMs / 1000).toFixed(2)}s`
          }
        />
        <SummaryCard
          label="Est. Cost"
          value={formatMoney(props.summary.totalCostUsd)}
        />
      </div>

      {props.summary.capped ? (
        <p className="text-xs text-cos-muted">
          Aggregates use the most recent loaded rows in range (cap reached).
          Narrow filters for full accuracy.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
        <div className="border-b border-cos-border px-4 py-3">
          <h2 className="font-serif text-lg text-cos-text">Providers</h2>
          <p className="mt-1 text-xs text-cos-muted">
            Health from real signals only — never fake “Operational”.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-cos-bg/70 text-xs uppercase tracking-wide text-cos-muted">
              <tr>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Requests</th>
                <th className="px-3 py-2 text-left">Failures</th>
                <th className="px-3 py-2 text-left">Avg latency</th>
                <th className="px-3 py-2 text-left">Est. cost</th>
                <th className="px-3 py-2 text-left">Health</th>
                <th className="px-3 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {props.providers.map((row) => (
                <tr key={row.provider} className="border-t border-cos-border/80">
                  <td className="px-3 py-2.5 font-medium capitalize text-cos-text">
                    {row.provider}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                    {row.requests.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                    {row.failures.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                    {row.avgLatencyMs == null
                      ? "—"
                      : `${(row.avgLatencyMs / 1000).toFixed(2)}s`}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-cos-text">
                    {formatMoney(row.totalCostUsd)}
                  </td>
                  <td className="px-3 py-2.5">
                    <HealthPill status={row.health} />
                  </td>
                  <td className="max-w-xs px-3 py-2.5 text-xs text-cos-muted">
                    {row.healthDetail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-6 py-12 text-center">
          <p className="font-serif text-xl text-cos-text">
            No connected API usage recorded in this range
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-cos-muted">
            Collecting since {AI_APIS_COLLECTING_SINCE}. Provider health above may
            still show connection/config signals when available.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
          <div className="flex items-center justify-between border-b border-cos-border px-4 py-3">
            <h2 className="font-serif text-lg text-cos-text">
              Recent API requests
            </h2>
            <p className="text-xs text-cos-muted">
              {props.totalFiltered.toLocaleString()} matching
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-cos-bg/70 text-xs uppercase tracking-wide text-cos-muted">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        props.onNavigate({
                          sort: "created_at",
                          dir:
                            props.sortKey === "created_at" &&
                            props.sortDir === "desc"
                              ? "asc"
                              : "desc",
                          page: 1,
                        })
                      }
                    >
                      Date & time
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">Organization</th>
                  <th className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        props.onNavigate({
                          sort: "provider",
                          dir:
                            props.sortKey === "provider" &&
                            props.sortDir === "desc"
                              ? "asc"
                              : "desc",
                          page: 1,
                        })
                      }
                    >
                      Provider
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">Operation</th>
                  <th className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        props.onNavigate({
                          sort: "success",
                          dir:
                            props.sortKey === "success" &&
                            props.sortDir === "desc"
                              ? "asc"
                              : "desc",
                          page: 1,
                        })
                      }
                    >
                      Status
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        props.onNavigate({
                          sort: "latency_ms",
                          dir:
                            props.sortKey === "latency_ms" &&
                            props.sortDir === "desc"
                              ? "asc"
                              : "desc",
                          page: 1,
                        })
                      }
                    >
                      Latency
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">Cost</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.rows.map((row) => (
                  <tr key={row.id} className="border-t border-cos-border/80">
                    <td className="whitespace-nowrap px-3 py-2.5 text-cos-muted">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-cos-text">
                      {row.organizationName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-cos-text">
                      {row.provider}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2.5 font-mono text-xs text-cos-muted">
                      {row.operation}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          row.success
                            ? "bg-cos-success-bg text-cos-success-text"
                            : "bg-[#f3e6e1] text-cos-error-text",
                        )}
                      >
                        {row.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-cos-muted">
                      {row.latencyMs == null
                        ? "—"
                        : `${(row.latencyMs / 1000).toFixed(2)}s`}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-cos-text">
                      {formatMoney(row.estimatedCostUsd)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-cos-border px-2 py-1 text-xs text-cos-text hover:bg-cos-bg"
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
              Page {props.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={props.page <= 1}
                onClick={() => props.onNavigate({ page: props.page - 1 })}
                className="rounded-md border border-cos-border px-2 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={props.page >= totalPages}
                onClick={() => props.onNavigate({ page: props.page + 1 })}
                className="rounded-md border border-cos-border px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selected ? (
        <ApiRequestDrawer row={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl text-cos-text tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ApiRequestDrawer({
  row,
  onClose,
}: {
  row: ApiUsageRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close drawer"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-cos-border bg-cos-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-cos-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
              API request
            </p>
            <h2 className="mt-1 break-all font-mono text-sm text-cos-text">
              {row.requestId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-cos-muted hover:bg-cos-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <Detail label="When" value={new Date(row.createdAt).toLocaleString()} />
          <Detail label="Organization" value={row.organizationName ?? "—"} />
          <Detail label="Provider" value={row.provider} />
          <Detail label="Operation" value={row.operation} />
          <Detail label="Environment" value={row.environment} />
          <Detail label="HTTP status" value={row.httpStatus?.toString() ?? "—"} />
          <Detail label="Status" value={row.success ? "Success" : "Failed"} />
          <Detail
            label="Latency"
            value={
              row.latencyMs == null ? "—" : `${(row.latencyMs / 1000).toFixed(2)}s`
            }
          />
          <Detail label="Estimated cost" value={formatMoney(row.estimatedCostUsd)} />
          <Detail label="Error code" value={row.errorCode ?? "—"} />
          <Detail label="Error" value={row.errorMessage ?? "—"} />
          <Detail
            label="Metadata"
            value={
              Object.keys(row.metadata).length
                ? JSON.stringify(row.metadata)
                : "—"
            }
          />
          <p className="text-xs text-cos-muted">
            Secrets and tokens are scrubbed before logging.
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
