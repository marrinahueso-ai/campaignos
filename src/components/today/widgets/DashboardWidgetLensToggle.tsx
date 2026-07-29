"use client";

import { cn } from "@/lib/utils/cn";
import type { DashboardWidgetLens } from "@/lib/today/dashboard-library-widget-filters";

interface DashboardWidgetLensToggleProps {
  value: DashboardWidgetLens;
  onChange: (value: DashboardWidgetLens) => void;
  label: string;
  className?: string;
}

export function DashboardWidgetLensToggle({
  value,
  onChange,
  label,
  className,
}: DashboardWidgetLensToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex gap-0.5 rounded-full border border-cos-border bg-cos-card/80 p-0.5",
        className,
      )}
      role="tablist"
      aria-label={label}
    >
      {(["mine", "everyone"] as const).map((lens) => (
        <button
          key={lens}
          type="button"
          role="tab"
          aria-selected={value === lens}
          onClick={() => onChange(lens)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
            value === lens
              ? "bg-cos-bg-alt text-cos-text shadow-sm"
              : "text-cos-muted hover:text-cos-text",
          )}
        >
          {lens === "mine" ? "Mine" : "Everyone"}
        </button>
      ))}
    </div>
  );
}
