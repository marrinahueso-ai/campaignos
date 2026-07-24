"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Palette icon (default) or a live color swatch/dot trigger. */
  variant?: "palette" | "dot";
  /** Display color for `variant="dot"` when `value` is null (product default). */
  swatchColor?: string | null;
}

const PANEL_WIDTH = 224; // w-56
const PANEL_ESTIMATED_HEIGHT = 180;
const VIEWPORT_PAD = 8;

export function DashboardWidgetColorPicker({
  label,
  value,
  onChange,
  variant = "palette",
  swatchColor = null,
}: DashboardWidgetColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = normalizeDashboardCardColor(value);
  const dotColor =
    normalizeDashboardCardColor(swatchColor) ?? current ?? "#ebe4d9";

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const trigger = rootRef.current?.querySelector("button");
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      let left = rect.right - PANEL_WIDTH;
      left = Math.max(
        VIEWPORT_PAD,
        Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD),
      );

      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
      const openAbove =
        spaceBelow < PANEL_ESTIMATED_HEIGHT &&
        rect.top > PANEL_ESTIMATED_HEIGHT + VIEWPORT_PAD;
      const top = openAbove
        ? Math.max(VIEWPORT_PAD, rect.top - PANEL_ESTIMATED_HEIGHT - 8)
        : rect.bottom + 8;

      setCoords({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            className="fixed z-[80] w-56 rounded-xl border border-cos-border bg-cos-card p-3 shadow-lg ring-1 ring-black/[0.06]"
            style={{ top: coords.top, left: coords.left }}
            role="dialog"
            aria-label={`${label} card color`}
          >
            <p className="mb-2 text-[11px] font-medium tracking-wide text-cos-muted uppercase">
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
                      selected &&
                        "ring-2 ring-cos-brand-sage ring-offset-2 ring-offset-cos-card",
                      preset.value === null &&
                        "bg-[linear-gradient(135deg,#fffcf7_50%,#ebe4d9_50%)]",
                    )}
                    style={
                      preset.value
                        ? { backgroundColor: preset.value }
                        : undefined
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          variant === "dot"
            ? // Larger hit target + dual ring so dark swatches stay visible on dark Show chips.
              "m-0.5 h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] ring-1 ring-black/25 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-brand-sage"
            : "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:text-cos-text",
        )}
        style={variant === "dot" ? { backgroundColor: dotColor } : undefined}
        aria-label={`Change ${label} color (updates calendar cards)`}
        aria-expanded={open}
        aria-controls={panelId}
        title={`Change ${label} color — updates calendar cards`}
      >
        {variant === "palette" ? (
          <Palette className="h-3.5 w-3.5" aria-hidden />
        ) : null}
      </button>
      {panel}
    </div>
  );
}
