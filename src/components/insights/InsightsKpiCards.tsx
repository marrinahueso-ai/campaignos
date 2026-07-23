import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MetricSparkline } from "@/components/insights/MetricSparkline";
import type { InsightsKpi, InsightsKpiKey } from "@/lib/insights/types";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import { cn } from "@/lib/utils/cn";

interface InsightsKpiCardsProps {
  kpis: InsightsKpi[];
  comparisonLabel: string;
  selectedKey?: InsightsKpiKey;
  onSelect?: (key: InsightsKpiKey) => void;
}

export function InsightsKpiCards({
  kpis,
  comparisonLabel,
  selectedKey,
  onSelect,
}: InsightsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpis.map((kpi) => {
        const change = formatChangePercent(kpi.changePercent);
        const positive = (kpi.changePercent ?? 0) >= 0;
        const selected = selectedKey === kpi.key;
        const interactive = Boolean(onSelect);

        const content = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                {kpi.label}
              </p>
              <MetricSparkline
                values={kpi.sparkline}
                className="h-8 w-20 shrink-0"
                stroke={selected ? "#2a2622" : "#5f735f"}
              />
            </div>

            <div className="mt-2 flex items-end gap-2">
              <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
                {kpi.value != null ? formatInsightsNumber(kpi.value) : "—"}
              </p>
              {kpi.unavailableReason ? null : change ? (
                <div className="mb-0.5 flex items-center gap-0.5 text-xs">
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
                </div>
              ) : null}
            </div>

            {kpi.unavailableReason ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-cos-muted">
                {kpi.unavailableReason}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-cos-muted">{comparisonLabel}</p>
            )}
          </>
        );

        if (interactive) {
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => onSelect?.(kpi.key)}
              aria-pressed={selected}
              className={cn(
                "min-h-[7.5rem] rounded-2xl bg-cos-bg-alt px-4 py-4 text-left shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 transition-colors",
                selected
                  ? "ring-cos-dark/40 ring-2"
                  : "ring-black/[0.04] hover:ring-cos-dark/20",
              )}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={kpi.key}
            className="min-h-[7.5rem] rounded-2xl bg-cos-bg-alt px-4 py-4 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
