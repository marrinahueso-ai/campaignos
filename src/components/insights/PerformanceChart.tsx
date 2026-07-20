"use client";

import { useMemo } from "react";
import type { InsightsPlatform, InsightsTimeSeriesByPlatform } from "@/lib/insights/types";

interface PerformanceChartProps {
  series: InsightsTimeSeriesByPlatform;
  platform: InsightsPlatform;
  emptyMessage: string | null;
}

const COLORS = {
  reach: "#2a2622",
  engagement: "#5f735f",
  clicks: "#b8956f",
} as const;

function buildSvgPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
  maxValue: number,
): string {
  if (values.length === 0) {
    return "";
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const normalized = maxValue > 0 ? value / maxValue : 0;
      const y = padding + innerHeight - normalized * innerHeight;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

/** Evenly spaced axis labels so long ranges (30–90 days) don’t blow up the layout. */
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
      label: date.slice(5),
    }));
  }

  const ticks: Array<{ index: number; label: string }> = [];
  const last = dates.length - 1;
  for (let i = 0; i < maxLabels; i += 1) {
    const index = Math.round((i * last) / (maxLabels - 1));
    ticks.push({ index, label: dates[index].slice(5) });
  }
  return ticks;
}

export function PerformanceChart({
  series,
  platform,
  emptyMessage,
}: PerformanceChartProps) {
  const filtered = useMemo(() => series[platform], [series, platform]);

  const maxValue = useMemo(() => {
    const values = filtered.flatMap((point) => [
      point.reach,
      point.engagement,
      point.clicks,
    ]);
    return Math.max(1, ...values, 0);
  }, [filtered]);

  const dateTicks = useMemo(
    () => pickDateTicks(filtered.map((point) => point.date)),
    [filtered],
  );

  if (filtered.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-cos-muted">
        {emptyMessage ?? "No chart data available."}
      </div>
    );
  }

  const width = 640;
  const height = 180;
  const padding = 20;
  const reachPath = buildSvgPath(
    filtered.map((point) => point.reach),
    width,
    height,
    padding,
    maxValue,
  );
  const engagementPath = buildSvgPath(
    filtered.map((point) => point.engagement),
    width,
    height,
    padding,
    maxValue,
  );
  const clicksPath = buildSvgPath(
    filtered.map((point) => point.clicks),
    width,
    height,
    padding,
    maxValue,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-cos-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: COLORS.reach }} />
          Reach
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: COLORS.engagement }} />
          Engagement
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: COLORS.clicks }} />
          Clicks
        </span>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-48 w-full"
          role="img"
          aria-label="Performance over time chart"
          preserveAspectRatio="xMidYMid meet"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + (height - padding * 2) * ratio;
            return (
              <line
                key={ratio}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="rgba(42,38,34,0.08)"
              />
            );
          })}
          <path d={reachPath} fill="none" stroke={COLORS.reach} strokeWidth="2" />
          <path
            d={engagementPath}
            fill="none"
            stroke={COLORS.engagement}
            strokeWidth="2"
          />
          <path d={clicksPath} fill="none" stroke={COLORS.clicks} strokeWidth="2" />
        </svg>

        <div className="mt-1 flex justify-between text-[11px] text-cos-muted">
          {dateTicks.map((tick) => (
            <span key={`${tick.index}-${tick.label}`}>{tick.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
