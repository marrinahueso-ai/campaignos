import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { InsightsKpi, InsightsKpiKey } from "@/lib/insights/types";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import { cn } from "@/lib/utils/cn";

interface InsightsKpiCardsProps {
  kpis: InsightsKpi[];
  icons: Record<InsightsKpiKey, LucideIcon>;
  comparisonLabel: string;
}

const KPI_ICON: Record<InsightsKpiKey, string> = {
  reach: "bg-[var(--cos-status-todo-bg)] text-[var(--cos-status-todo-text)]",
  engagement: "bg-[var(--cos-accent-soft)] text-[var(--cos-warning-text)]",
  likes: "bg-[var(--cos-error-bg)] text-[var(--cos-error-text)]",
  comments: "bg-[var(--cos-status-progress-bg)] text-[var(--cos-status-progress-text)]",
  shares: "bg-[var(--cos-status-done-bg)] text-[var(--cos-status-done-text)]",
};

export function InsightsKpiCards({
  kpis,
  icons,
  comparisonLabel,
}: InsightsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = icons[kpi.key];
        const change = formatChangePercent(kpi.changePercent);
        const positive = (kpi.changePercent ?? 0) >= 0;

        return (
          <div
            key={kpi.key}
            className="flex flex-col items-center rounded-xl border border-cos-border bg-cos-card px-3 py-5 text-center shadow-sm"
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full",
                KPI_ICON[kpi.key],
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-cos-muted">
              {kpi.label}
            </p>
            <p className="font-display mt-1 text-3xl leading-none text-cos-text">
              {kpi.value != null ? formatInsightsNumber(kpi.value) : "—"}
            </p>

            {kpi.unavailableReason ? (
              <p className="mt-3 line-clamp-2 text-[11px] leading-snug text-cos-muted">
                {kpi.unavailableReason}
              </p>
            ) : change ? (
              <div className="mt-3 flex items-center justify-center gap-0.5 text-[11px]">
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-cos-success" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-cos-error" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    positive ? "text-cos-success-text" : "text-cos-error-text",
                  )}
                >
                  {change}
                </span>
                <span className="text-cos-muted">{comparisonLabel}</span>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-cos-muted">{comparisonLabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
