"use client";

import { cn } from "@/lib/utils/cn";
import type {
  OwnerAiCreditsDashboard,
  OwnerAiCreditsHealth,
  OwnerAiCreditsOrgRow,
} from "@/lib/ops/ai-credits-queries";

type Props = {
  search: string;
  organizationId: string;
  health: string;
  page: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  selectedOrgId: string;
  credits: OwnerAiCreditsDashboard;
  onNavigate: (patch: Record<string, string | number | undefined>) => void;
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTier(tier: string): string {
  if (tier === "founding") return "Founding";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function healthLabel(health: OwnerAiCreditsHealth): string {
  switch (health) {
    case "unlimited":
      return "Unlimited";
    case "ok":
      return "OK";
    case "soft_warn":
      return "Low";
    case "exhausted":
      return "Exhausted";
    case "no_balance":
      return "No balance yet";
  }
}

function HealthPill({ health }: { health: OwnerAiCreditsHealth }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        health === "ok" && "bg-cos-success-bg text-cos-success-text",
        health === "unlimited" && "bg-cos-bg text-cos-text",
        health === "soft_warn" && "bg-cos-warning text-cos-warning-text",
        health === "exhausted" && "bg-cos-error-bg text-cos-error-text",
        health === "no_balance" && "bg-cos-bg text-cos-muted",
      )}
    >
      {healthLabel(health)}
    </span>
  );
}

function SortTh({
  id,
  label,
  sortKey,
  sortDir,
  onNavigate,
}: {
  id: string;
  label: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onNavigate: Props["onNavigate"];
}) {
  const active = sortKey === id;
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cos-muted">
      <button
        type="button"
        className="hover:text-cos-text"
        onClick={() =>
          onNavigate({
            sort: id,
            dir: active && sortDir === "desc" ? "asc" : "desc",
            page: 1,
          })
        }
      >
        {label}
        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export function CreditsPanel(props: Props) {
  const { credits } = props;
  const totalPages = Math.max(
    1,
    Math.ceil(credits.totalFiltered / credits.pageSize),
  );
  const selected =
    credits.rows.find((r) => r.organizationId === props.selectedOrgId) ??
    credits.rows[0] ??
    null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3 text-sm text-cos-muted">
        UTC period <span className="font-medium text-cos-text">{credits.periodYm}</span>
        . Monthly credits do not roll over; Reserve does. Soft warnings only —
        hard stops ship later.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Organizations"
          value={String(credits.summary.orgCount)}
        />
        <SummaryTile
          label="Low balance"
          value={String(credits.summary.softWarnCount)}
          warn={credits.summary.softWarnCount > 0}
        />
        <SummaryTile
          label="Exhausted"
          value={String(credits.summary.exhaustedCount)}
          warn={credits.summary.exhaustedCount > 0}
        />
        <SummaryTile
          label="OpenAI $ (period)"
          value={formatMoney(credits.summary.totalOpenaiCostUsd)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
        <input
          type="search"
          defaultValue={props.search}
          placeholder="Search organizations…"
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
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-cos-muted">
            Organization
            <select
              value={props.organizationId}
              onChange={(event) =>
                props.onNavigate({
                  organizationId: event.target.value,
                  page: 1,
                })
              }
              className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              <option value="">All</option>
              {credits.filterOptions.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cos-muted">
            Health
            <select
              value={props.health}
              onChange={(event) =>
                props.onNavigate({ health: event.target.value, page: 1 })
              }
              className="mt-1 block w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              <option value="">All</option>
              <option value="soft_warn">Low</option>
              <option value="exhausted">Exhausted</option>
              <option value="unlimited">Unlimited</option>
              <option value="ok">OK</option>
              <option value="no_balance">No balance yet</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-cos-border bg-cos-bg/60">
                <tr>
                  <SortTh
                    id="name"
                    label="Organization"
                    sortKey={props.sortKey}
                    sortDir={props.sortDir}
                    onNavigate={props.onNavigate}
                  />
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cos-muted">
                    Plan
                  </th>
                  <SortTh
                    id="used"
                    label="Used"
                    sortKey={props.sortKey}
                    sortDir={props.sortDir}
                    onNavigate={props.onNavigate}
                  />
                  <SortTh
                    id="periodRemaining"
                    label="Left"
                    sortKey={props.sortKey}
                    sortDir={props.sortDir}
                    onNavigate={props.onNavigate}
                  />
                  <SortTh
                    id="reserveBalance"
                    label="Reserve"
                    sortKey={props.sortKey}
                    sortDir={props.sortDir}
                    onNavigate={props.onNavigate}
                  />
                  <SortTh
                    id="openaiCostUsd"
                    label="OpenAI $"
                    sortKey={props.sortKey}
                    sortDir={props.sortDir}
                    onNavigate={props.onNavigate}
                  />
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cos-muted">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody>
                {credits.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-cos-muted"
                    >
                      No organizations match these filters.
                    </td>
                  </tr>
                ) : (
                  credits.rows.map((row) => (
                    <OrgRow
                      key={row.organizationId}
                      row={row}
                      selected={
                        row.organizationId ===
                        (props.selectedOrgId || selected?.organizationId)
                      }
                      onSelect={() =>
                        props.onNavigate({
                          org: row.organizationId,
                        })
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-cos-border px-3 py-2 text-xs text-cos-muted">
              <span>
                Page {credits.page} of {totalPages} · {credits.totalFiltered}{" "}
                orgs
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={credits.page <= 1}
                  className="rounded border border-cos-border px-2 py-1 disabled:opacity-40"
                  onClick={() => props.onNavigate({ page: credits.page - 1 })}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={credits.page >= totalPages}
                  className="rounded border border-cos-border px-2 py-1 disabled:opacity-40"
                  onClick={() => props.onNavigate({ page: credits.page + 1 })}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm">
          {selected ? (
            <>
              <p className="font-display text-xl text-cos-text">
                {selected.organizationName}
              </p>
              <p className="mt-1 text-sm text-cos-muted">
                {formatTier(selected.planTier)}
                {selected.unlimited ? " · unlimited credits" : null}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-cos-muted">Period used</dt>
                  <dd className="font-medium tabular-nums text-cos-text">
                    {selected.unlimited
                      ? "—"
                      : `${selected.used} / ${selected.allowance}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-cos-muted">Remaining</dt>
                  <dd className="font-medium tabular-nums text-cos-text">
                    {selected.unlimited ? "∞" : selected.periodRemaining}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-cos-muted">Reserve</dt>
                  <dd className="font-medium tabular-nums text-cos-text">
                    {selected.reserveBalance.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-cos-muted">OpenAI $ (period)</dt>
                  <dd className="font-medium tabular-nums text-cos-text">
                    {formatMoney(selected.openaiCostUsd)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cos-muted">
                Recent ledger
              </p>
              {credits.ledger.length === 0 ? (
                <p className="mt-2 text-sm text-cos-muted">
                  No ledger entries yet for this org.
                </p>
              ) : (
                <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto text-sm">
                  {credits.ledger.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-cos-border bg-cos-bg/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-cos-text">
                          {entry.entryType}
                          {entry.bucket ? ` · ${entry.bucket}` : ""}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            entry.amount < 0
                              ? "text-cos-error-text"
                              : "text-cos-text",
                          )}
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {entry.amount}
                        </span>
                      </div>
                      {entry.note ? (
                        <p className="mt-1 text-xs text-cos-muted">{entry.note}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-cos-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.periodYm ? ` · ${entry.periodYm}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-cos-muted">
              Select an organization to inspect its credit ledger.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl tabular-nums",
          warn ? "text-cos-error-text" : "text-cos-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function OrgRow({
  row,
  selected,
  onSelect,
}: {
  row: OwnerAiCreditsOrgRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-cos-border/70 hover:bg-cos-bg/50",
        selected && "bg-cos-bg/80",
      )}
      onClick={onSelect}
    >
      <td className="px-3 py-2.5 font-medium text-cos-text">
        {row.organizationName}
      </td>
      <td className="px-3 py-2.5 text-cos-muted">{formatTier(row.planTier)}</td>
      <td className="px-3 py-2.5 tabular-nums text-cos-text">
        {row.unlimited ? "—" : `${row.used} / ${row.allowance}`}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-cos-text">
        {row.unlimited ? "∞" : row.periodRemaining}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-cos-text">
        {row.reserveBalance.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-cos-text">
        {formatMoney(row.openaiCostUsd)}
      </td>
      <td className="px-3 py-2.5">
        <HealthPill health={row.health} />
      </td>
    </tr>
  );
}
