"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Palette } from "lucide-react";
import {
  DASHBOARD_CARD_COLOR_PRESETS,
  normalizeDashboardCardColor,
} from "@/lib/today/dashboard-widget-colors";
import { cn } from "@/lib/utils/cn";

interface DashboardWidgetColorPickerProps {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
}

export function DashboardWidgetColorPicker({
  label,
  value,
  onChange,
}: DashboardWidgetColorPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = normalizeDashboardCardColor(value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text"
        aria-label={`Change color for ${label}`}
        aria-expanded={open}
        aria-controls={panelId}
        title="Card color"
      >
        <Palette className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-9 z-40 w-56 rounded-xl border border-cos-border bg-cos-card p-3 shadow-lg ring-1 ring-black/[0.06]"
          role="dialog"
          aria-label={`${label} card color`}
        >
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-cos-muted">
            Card color
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {DASHBOARD_CARD_COLOR_PRESETS.map((preset) => {
              const selected =
                preset.value === null
                  ? current === null
                  : current === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => {
                    onChange(preset.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-7 w-7 rounded-full border border-cos-border shadow-sm transition-transform hover:scale-105",
                    selected && "ring-2 ring-cos-brand-sage ring-offset-2 ring-offset-cos-card",
                    preset.value === null &&
                      "bg-[linear-gradient(135deg,#fffcf7_50%,#ebe4d9_50%)]",
                  )}
                  style={
                    preset.value ? { backgroundColor: preset.value } : undefined
                  }
                />
              );
            })}
          </div>
          <label className="mt-3 flex items-center justify-between gap-2 text-xs text-cos-muted">
            Custom
            <input
              type="color"
              value={current ?? "#ebe4d9"}
              onChange={(event) => onChange(event.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-cos-border bg-transparent p-0.5"
            />
          </label>
          {current ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
            >
              Reset to default
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
