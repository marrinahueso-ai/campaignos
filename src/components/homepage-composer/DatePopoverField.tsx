"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(value: string | null | undefined): string {
  const date = parseIsoDate(value);
  if (!date) return "Select date";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m} / ${d} / ${date.getFullYear()}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthCells(month: Date): Array<Date | null> {
  const first = startOfMonth(month);
  const startPad = first.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export type DatePopoverFieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  className?: string;
  /** Compact trigger (announcement row). */
  size?: "sm" | "md";
  clearable?: boolean;
};

/**
 * Floating calendar popover — never expands the parent layout (unlike Safari’s
 * native `<input type="date">`, which grows inline inside overflow containers).
 */
export function DatePopoverField({
  label,
  value,
  onChange,
  disabled = false,
  className,
  size = "md",
  clearable = true,
}: DatePopoverFieldProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selected = parseIsoDate(value);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected ?? new Date()),
  );
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setViewMonth(startOfMonth(selected ?? new Date()));
  }, [open, selected]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function place() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const panelWidth = Math.max(rect.width, 280);
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - panelWidth - 8,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 320 && rect.top > spaceBelow;
      setCoords({
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        left,
        width: panelWidth,
        openUp,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const cells = buildMonthCells(viewMonth);
  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="dialog"
            aria-label={`${label} calendar`}
            className="fixed z-[200] rounded-2xl border border-cos-border bg-cos-card p-3 shadow-[0_16px_40px_rgba(42,38,34,0.18)]"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUp ? "translateY(-100%)" : undefined,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                aria-label="Previous month"
                onClick={() =>
                  setViewMonth(
                    new Date(
                      viewMonth.getFullYear(),
                      viewMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <p className="text-sm font-semibold text-cos-text">{monthLabel}</p>
              <button
                type="button"
                className="rounded-lg p-1.5 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                aria-label="Next month"
                onClick={() =>
                  setViewMonth(
                    new Date(
                      viewMonth.getFullYear(),
                      viewMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-cos-muted">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, index) => {
                if (!day) {
                  return <span key={`empty-${index}`} className="h-8" />;
                }
                const iso = toIsoDate(day);
                const isSelected = value === iso;
                const isToday = toIsoDate(new Date()) === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={cn(
                      "h-8 rounded-lg text-sm font-semibold transition-colors",
                      isSelected
                        ? "bg-cos-text text-white"
                        : isToday
                          ? "bg-cos-bg text-cos-text ring-1 ring-cos-border"
                          : "text-cos-text hover:bg-cos-bg",
                    )}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-cos-border pt-2">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-semibold text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                onClick={() => {
                  const today = toIsoDate(new Date());
                  onChange(today);
                  setOpen(false);
                }}
              >
                Today
              </button>
              {clearable ? (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative block", className)}>
      <span
        className={cn(
          "block font-bold uppercase tracking-wide text-cos-muted",
          size === "sm"
            ? "text-[10px] tracking-[0.05em]"
            : "text-[11px] tracking-wide",
        )}
      >
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          "mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-cos-border bg-cos-card text-left font-normal normal-case tracking-normal text-cos-text transition-colors hover:border-cos-text/30 disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" ? "px-2 py-2 text-sm" : "px-2 py-1.5 text-xs",
          !value && "text-cos-muted",
        )}
      >
        <span className="min-w-0 truncate">{formatDisplayDate(value)}</span>
        <CalendarDays
          className="h-3.5 w-3.5 shrink-0 text-cos-muted"
          strokeWidth={1.75}
        />
      </button>
      {panel}
    </div>
  );
}
