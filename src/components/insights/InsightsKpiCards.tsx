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

export function InsightsKpiCards({
  kpis,
  icons,
  comparisonLabel,
}: InsightsKpiCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = icons[kpi.key];
        const change = formatChangePercent(kpi.changePercent);
        const positive = (kpi.changePercent ?? 0) >= 0;

        return (
          <div
            key={kpi.key}
            className="border border-cos-border bg-cos-card px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-cos-muted">{kpi.label}</p>
                <p className="font-display mt-2 text-3xl text-cos-text">
                  {kpi.value != null ? formatInsightsNumber(kpi.value) : "—"}
                </p>
              </div>
              <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
            </div>

            {kpi.unavailableReason ? (
              <p className="mt-3 text-[11px] leading-snug text-cos-muted">
                {kpi.unavailableReason}
              </p>
            ) : change ? (
              <div className="mt-3 flex items-center gap-1 text-[11px]">
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
