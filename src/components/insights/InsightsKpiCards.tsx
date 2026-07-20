import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { InsightsKpi } from "@/lib/insights/types";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import { cn } from "@/lib/utils/cn";

interface InsightsKpiCardsProps {
  kpis: InsightsKpi[];
  comparisonLabel: string;
}

export function InsightsKpiCards({
  kpis,
  comparisonLabel,
}: InsightsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const change = formatChangePercent(kpi.changePercent);
        const positive = (kpi.changePercent ?? 0) >= 0;

        return (
          <div
            key={kpi.key}
            className="flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"
          >
            <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              {kpi.label}
            </p>
            <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
              {kpi.value != null ? formatInsightsNumber(kpi.value) : "—"}
            </p>

            {kpi.unavailableReason ? (
              <p className="line-clamp-2 text-xs leading-snug text-cos-muted">
                {kpi.unavailableReason}
              </p>
            ) : change ? (
              <div className="flex items-center justify-center gap-0.5 text-xs text-cos-muted">
                {positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    positive ? "text-cos-success-text" : "text-cos-error-text",
                  )}
                >
                  {change}
                </span>
                <span>{comparisonLabel}</span>
              </div>
            ) : (
              <p className="text-xs text-cos-muted">{comparisonLabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
