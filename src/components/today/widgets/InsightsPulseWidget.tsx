import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type { InsightsKpi, InsightsPageData } from "@/lib/insights/types";

interface InsightsPulseWidgetProps {
  data: InsightsPageData | null;
}

const PULSE_KEYS = ["reach", "engagement", "views"] as const;

export function InsightsPulseWidget({ data }: InsightsPulseWidgetProps) {
  if (!data) {
    return (
      <DashboardWidgetCard icon={BarChart3} title="Insights">
        <p className="text-sm text-cos-muted">
          Insights aren&apos;t available for this school yet.
        </p>
        <Link
          href="/insights"
          className="mt-3 inline-block text-xs font-medium text-cos-brand-sage hover:text-cos-brand-navy"
        >
          Open Insights →
        </Link>
      </DashboardWidgetCard>
    );
  }

  const connection = data.connection;
  const needsConnect =
    !connection.metaConnected || connection.reconnectRequired;
  const kpis = PULSE_KEYS.map((key) =>
    data.kpis.find((kpi) => kpi.key === key),
  ).filter((kpi): kpi is InsightsKpi => Boolean(kpi));

  return (
    <DashboardWidgetCard icon={BarChart3} title="Insights">
      {needsConnect ? (
        <div className="space-y-2">
          <p className="text-sm text-cos-muted">
            Connect Meta to see recent social performance.
          </p>
          <Link
            href="/insights"
            className="text-xs font-medium text-cos-brand-sage hover:text-cos-brand-navy"
          >
            Connect in Insights →
          </Link>
        </div>
      ) : !data.hasAnyMetrics ? (
        <div className="space-y-2">
          <p className="text-sm text-cos-muted">
            No metrics for {data.dateRange.label.toLowerCase()} yet.
          </p>
          <Link
            href="/insights?range=7d"
            className="text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            Open Insights →
          </Link>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-3">
            {kpis.map((kpi) => (
              <li key={kpi.key} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-cos-muted">{kpi.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-xl leading-none text-cos-text tabular-nums">
                    {formatKpiValue(kpi.value)}
                  </span>
                  <ChangeBadge changePercent={kpi.changePercent} />
                </span>
              </li>
            ))}
          </ul>
          {data.recommendation?.summary ? (
            <p className="mt-4 line-clamp-2 text-xs text-cos-muted">
              {data.recommendation.summary}
            </p>
          ) : null}
          <Link
            href="/insights?range=7d"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            View Insights →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function formatKpiValue(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("en-US");
}

function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent == null || !Number.isFinite(changePercent)) {
    return null;
  }
  const up = changePercent >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        up
          ? "inline-flex items-center text-[11px] text-cos-success"
          : "inline-flex items-center text-[11px] text-cos-error"
      }
    >
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(Math.round(changePercent))}%
    </span>
  );
}
