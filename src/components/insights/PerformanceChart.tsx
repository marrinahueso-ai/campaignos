"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  InsightsKpi,
  InsightsKpiKey,
  InsightsPlatform,
  InsightsTimeSeriesByPlatform,
  InsightsTimeSeriesPoint,
} from "@/lib/insights/types";
import { formatChangePercent, formatInsightsNumber } from "@/lib/insights/format";
import { cn } from "@/lib/utils/cn";

interface PerformanceChartProps {
  series: InsightsTimeSeriesByPlatform;
  platform: InsightsPlatform;
  metric: InsightsKpiKey;
  kpis: InsightsKpi[];
  emptyMessage: string | null;
}

const METRIC_COLOR = "#2a2622";
const SECONDARY_COLOR = "#5f735f";

function valueForMetric(point: InsightsTimeSeriesPoint, metric: InsightsKpiKey): number {
  switch (metric) {
    case "views":
      return point.views;
    case "reach":
      return point.reach;
    case "engagement":
      return point.engagement;
    case "likes":
      return point.likes;
    case "comments":
      return point.comments;
    default:
      return 0;
  }
}

function buildSvgPath(
  values: number[],
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
  maxValue: number,
): string {
  if (values.length === 0) {
    return "";
  }

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = paddingX + index * step;
      const normalized = maxValue > 0 ? value / maxValue : 0;
      const y = paddingY + innerHeight - normalized * innerHeight;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function pickDateTicks(
  dates: string[],
  maxLabels = 6,
): Array<{ index: number; label: string }> {
  if (dates.length === 0) {
    return [];
  }
  if (dates.length <= maxLabels) {
    return dates.map((date, index) => ({
      index,
      label: formatAxisDate(date),
    }));
  }

  const ticks: Array<{ index: number; label: string }> = [];
  const last = dates.length - 1;
  for (let i = 0; i < maxLabels; i += 1) {
    const index = Math.round((i * last) / (maxLabels - 1));
    ticks.push({ index, label: formatAxisDate(dates[index]) });
  }
  return ticks;
}

function formatAxisDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date.slice(5);
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTooltipDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PerformanceChart({
  series,
  platform,
  metric,
  kpis,
  emptyMessage,
}: PerformanceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const filtered = useMemo(() => series[platform], [series, platform]);
  const selectedKpi = kpis.find((kpi) => kpi.key === metric) ?? null;

  const metricValues = useMemo(
    () => filtered.map((point) => valueForMetric(point, metric)),
    [filtered, metric],
  );

  const secondaryValues = useMemo(() => {
    if (metric === "views") {
      return filtered.map((point) => point.reach);
    }
    return null;
  }, [filtered, metric]);

  const maxValue = useMemo(() => {
    const candidates = [...metricValues, ...(secondaryValues ?? [])];
    return Math.max(1, ...candidates, 0);
  }, [metricValues, secondaryValues]);

  const dateTicks = useMemo(
    () => pickDateTicks(filtered.map((point) => point.date)),
    [filtered],
  );

  const hasSignal = metricValues.some((value) => value > 0);

  if (filtered.length === 0 || !hasSignal) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-cos-muted">
        {emptyMessage ?? "No chart data available for this metric."}
      </div>
    );
  }

  const width = 720;
  const height = 220;
  const paddingX = 28;
  const paddingY = 18;
  const primaryPath = buildSvgPath(
    metricValues,
    width,
    height,
    paddingX,
    paddingY,
    maxValue,
  );
  const secondaryPath =
    secondaryValues != null
      ? buildSvgPath(secondaryValues, width, height, paddingX, paddingY, maxValue)
      : "";

  const hoverPoint =
    hoverIndex != null && filtered[hoverIndex] ? filtered[hoverIndex] : null;
  const hoverX =
    hoverIndex != null && metricValues.length > 1
      ? paddingX + (hoverIndex * (width - paddingX * 2)) / (metricValues.length - 1)
      : paddingX;

  const change = formatChangePercent(selectedKpi?.changePercent ?? null);
  const positive = (selectedKpi?.changePercent ?? 0) >= 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_11rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-cos-muted">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: METRIC_COLOR }}
            />
            {selectedKpi?.label ?? "Metric"}
          </span>
          {secondaryValues ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SECONDARY_COLOR }}
              />
              Reach (unique)
            </span>
          ) : null}
        </div>

        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-56 w-full"
            role="img"
            aria-label={`${selectedKpi?.label ?? "Performance"} over time chart`}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + (height - paddingY * 2) * ratio;
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgba(42,38,34,0.08)"
                />
              );
            })}

            {secondaryPath ? (
              <path
                d={secondaryPath}
                fill="none"
                stroke={SECONDARY_COLOR}
                strokeWidth="2"
                strokeOpacity="0.75"
              />
            ) : null}
            <path
              d={primaryPath}
              fill="none"
              stroke={METRIC_COLOR}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {metricValues.map((_, index) => {
              const x =
                metricValues.length > 1
                  ? paddingX +
                    (index * (width - paddingX * 2)) / (metricValues.length - 1)
                  : paddingX;
              return (
                <rect
                  key={filtered[index]?.date ?? index}
                  x={x - 8}
                  y={paddingY}
                  width={16}
                  height={height - paddingY * 2}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
              );
            })}

            {hoverPoint ? (
              <>
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={paddingY}
                  y2={height - paddingY}
                  stroke="rgba(42,38,34,0.2)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hoverX}
                  cy={
                    paddingY +
                    (height - paddingY * 2) *
                      (1 - (valueForMetric(hoverPoint, metric) || 0) / maxValue)
                  }
                  r="4"
                  fill={METRIC_COLOR}
                />
              </>
            ) : null}
          </svg>

          {hoverPoint ? (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[9rem] rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-xs shadow-md"
              style={{
                left: `clamp(0.5rem, ${(hoverX / width) * 100}% , calc(100% - 10rem))`,
              }}
            >
              <p className="font-medium text-cos-text">
                {formatTooltipDate(hoverPoint.date)}
              </p>
              <p className="mt-1 text-cos-muted">
                {selectedKpi?.label ?? "Metric"}:{" "}
                <span className="font-medium text-cos-text tabular-nums">
                  {formatInsightsNumber(valueForMetric(hoverPoint, metric))}
                </span>
              </p>
              {secondaryValues ? (
                <p className="text-cos-muted">
                  Reach:{" "}
                  <span className="font-medium text-cos-text tabular-nums">
                    {formatInsightsNumber(hoverPoint.reach)}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-1 flex justify-between text-[11px] text-cos-muted">
            {dateTicks.map((tick) => (
              <span key={`${tick.index}-${tick.label}`}>{tick.label}</span>
            ))}
          </div>
        </div>
      </div>

      <aside className="rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-4">
        <p className="text-[11px] font-medium tracking-wide text-cos-muted uppercase">
          {selectedKpi?.label ?? "Metric"} breakdown
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[11px] text-cos-muted">Total</p>
            <div className="mt-0.5 flex items-end gap-1.5">
              <p className="font-display text-2xl text-cos-text tabular-nums">
                {formatInsightsNumber(selectedKpi?.value)}
              </p>
              {change ? (
                <span
                  className={cn(
                    "mb-0.5 inline-flex items-center text-[11px] font-medium",
                    positive ? "text-cos-success-text" : "text-cos-error-text",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {change}
                </span>
              ) : null}
            </div>
          </div>

          {metric === "views" ? (
            <div>
              <p className="text-[11px] text-cos-muted">Reach (unique)</p>
              <p className="mt-0.5 font-display text-xl text-cos-text tabular-nums">
                {formatInsightsNumber(
                  filtered.reduce((sum, point) => sum + point.reach, 0),
                )}
              </p>
            </div>
          ) : null}

          <p className="text-[11px] leading-relaxed text-cos-muted">
            Organic vs ads split is not available with current Meta Page insights.
          </p>
        </div>
      </aside>
    </div>
  );
}
