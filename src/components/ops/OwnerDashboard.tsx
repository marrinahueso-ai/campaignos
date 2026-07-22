import Link from "next/link";
import {
  Building2,
  Download,
  FileCheck2,
  FilePenLine,
  PenLine,
  Users,
  Code2,
  CalendarDays,
} from "lucide-react";
import type {
  DeveloperSignedRow,
  OwnerDashboardMetrics,
} from "@/lib/ops/queries";

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl text-cos-text tabular-nums">
            {value.toLocaleString()}
          </p>
          {hint ? <p className="mt-1 text-xs text-cos-muted">{hint}</p> : null}
        </div>
        <span className="rounded-xl bg-cos-bg p-2 text-cos-muted">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}

function SignupSparkline({
  series,
}: {
  series: Array<{ date: string; count: number }>;
}) {
  const max = Math.max(1, ...series.map((point) => point.count));
  const width = 320;
  const height = 96;
  const points = series
    .map((point, index) => {
      const x = (index / Math.max(1, series.length - 1)) * width;
      const y = height - (point.count / max) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-cos-text">Organization signups</h2>
          <p className="mt-1 text-sm text-cos-muted">Last 30 days</p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-24 w-full text-cos-brand-navy"
        role="img"
        aria-label="Organization signups over the last 30 days"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}

function StatusPill({ status }: { status: DeveloperSignedRow["status"] }) {
  if (status === "fully_executed") {
    return (
      <span className="inline-flex rounded-full bg-cos-success-bg px-2.5 py-1 text-xs font-semibold text-cos-success-text">
        Fully executed
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-cos-warning px-2.5 py-1 text-xs font-semibold text-cos-warning-text">
      Awaiting company
    </span>
  );
}

export function OwnerDashboard({
  metrics,
  developersSigned,
  signupSeries,
}: {
  metrics: OwnerDashboardMetrics;
  developersSigned: DeveloperSignedRow[];
  signupSeries: Array<{ date: string; count: number }>;
}) {
  const awaiting = developersSigned.filter(
    (row) => row.status === "awaiting_company",
  );

  return (
    <div className="studio-page space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cos-muted">
            Hey Ralli ops
          </p>
          <h1 className="mt-2 font-serif text-3xl text-cos-text md:text-4xl">
            Owner dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-cos-muted">
            Platform overview and developer agreement signatures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/account/agreements/countersign"
            className="inline-flex items-center gap-2 rounded-lg bg-cos-primary px-4 py-2 text-sm font-medium text-[#f6f2eb] hover:bg-cos-primary-hover"
          >
            <PenLine className="h-4 w-4" />
            Counter-sign
            {metrics.agreementsAwaitingCompany > 0
              ? ` (${metrics.agreementsAwaitingCompany})`
              : ""}
          </Link>
          <Link
            href="/account/agreements/manage"
            className="inline-flex items-center gap-2 rounded-lg border border-cos-border bg-cos-card px-4 py-2 text-sm font-medium text-cos-text hover:bg-cos-bg"
          >
            Manage agreements
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Organizations"
          value={metrics.organizations}
          icon={Building2}
        />
        <MetricCard
          label="Active members"
          value={metrics.activeMembers}
          icon={Users}
        />
        <MetricCard
          label="Developers"
          value={metrics.developers}
          icon={Code2}
        />
        <MetricCard
          label="Events"
          value={metrics.events}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SignupSparkline series={signupSeries} />
        <div className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
          <h2 className="font-serif text-lg text-cos-text">Agreements</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-cos-muted">
                <FilePenLine className="h-4 w-4" />
                Awaiting your signature
              </span>
              <span className="font-semibold tabular-nums text-cos-text">
                {metrics.agreementsAwaitingCompany}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-cos-muted">
                <FileCheck2 className="h-4 w-4" />
                Fully executed
              </span>
              <span className="font-semibold tabular-nums text-cos-text">
                {metrics.agreementsFullyExecuted}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 border-t border-cos-border pt-3">
              <span className="text-cos-muted">Total developer signatures</span>
              <span className="font-semibold tabular-nums text-cos-text">
                {metrics.agreementsSignedTotal}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <section className="rounded-2xl border border-cos-border bg-cos-card shadow-sm">
        <div className="flex flex-col gap-2 border-b border-cos-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-cos-text">Developers signed</h2>
            <p className="mt-1 text-sm text-cos-muted">
              NDA / IP signatures from developer seats. Counter-sign pending items
              to fully execute and email the packet.
            </p>
          </div>
          {awaiting.length > 0 ? (
            <p className="text-sm font-medium text-cos-warning-text">
              {awaiting.length} waiting for company signature
            </p>
          ) : null}
        </div>

        {developersSigned.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-cos-muted">
            No developer agreements signed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-cos-bg text-xs uppercase tracking-[0.08em] text-cos-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Developer</th>
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-5 py-3 font-semibold">Signed</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cos-border">
                {developersSigned.map((row) => (
                  <tr key={row.signatureId} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-cos-text">
                        {row.developerName}
                      </p>
                      <p className="text-xs text-cos-muted">
                        {row.developerEmail}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-cos-text">{row.documentTitle}</p>
                      <p className="text-xs text-cos-muted">{row.versionLabel}</p>
                    </td>
                    <td className="px-5 py-4 text-cos-muted">
                      {formatShortDate(row.signedAt)}
                      {row.companySignedAt ? (
                        <p className="mt-1 text-xs">
                          Company: {formatShortDate(row.companySignedAt)}
                          {row.companySignerName
                            ? ` · ${row.companySignerName}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-3">
                        {row.status === "awaiting_company" ? (
                          <Link
                            href={`/account/agreements/countersign?id=${row.signatureId}`}
                            className="font-medium text-cos-text underline underline-offset-2"
                          >
                            Counter-sign
                          </Link>
                        ) : null}
                        {row.canDownload ? (
                          <a
                            href={`/api/developer-agreements/download?id=${row.signatureId}`}
                            className="inline-flex items-center gap-1 font-medium text-cos-text underline underline-offset-2"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
