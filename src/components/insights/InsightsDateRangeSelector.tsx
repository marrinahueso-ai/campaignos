"use client";

import { useRouter } from "next/navigation";
import { INSIGHTS_DATE_PRESETS } from "@/lib/insights/date-range";
import { addDays, formatDateYmd } from "@/lib/insights/date-range";
import { cn } from "@/lib/utils/cn";

interface InsightsDateRangeSelectorProps {
  currentFrom: string;
  currentTo: string;
  currentLabel: string;
}

export function InsightsDateRangeSelector({
  currentFrom,
  currentTo,
  currentLabel,
}: InsightsDateRangeSelectorProps) {
  const router = useRouter();

  function applyPreset(days: number) {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    const start = addDays(end, -(days - 1));
    const from = formatDateYmd(start);
    const to = formatDateYmd(end);
    router.push(`/insights?from=${from}&to=${to}`);
  }

  const activePreset = INSIGHTS_DATE_PRESETS.find((preset) => {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    const start = addDays(end, -(preset.days - 1));
    return currentFrom === formatDateYmd(start) && currentTo === formatDateYmd(end);
  });

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="insights-date-range">
        Date range
      </label>
      <select
        id="insights-date-range"
        value={activePreset?.id ?? "custom"}
        onChange={(event) => {
          const preset = INSIGHTS_DATE_PRESETS.find(
            (entry) => entry.id === event.target.value,
          );
          if (preset) {
            applyPreset(preset.days);
          }
        }}
        className={cn(
          "h-10 min-w-[12rem] border border-cos-border bg-cos-card px-3 text-sm text-cos-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-muted",
        )}
      >
        {!activePreset ? (
          <option value="custom">Custom · {currentLabel}</option>
        ) : null}
        {INSIGHTS_DATE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
