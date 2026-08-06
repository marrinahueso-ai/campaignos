"use client";

import { cn } from "@/lib/utils/cn";
import { Calendar } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 72;
const VIEWPORT_PAD = 8;

type DatePopoverFieldProps = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Compact trigger for dense card/announcement rows */
  compact?: boolean;
  className?: string;
};

type PanelCoords = {
  top: number;
  left: number;
};

function formatDisplayDate(ymd: string | null): string {
  if (!ymd) return "Pick date";
  const [y, m, d] = ymd.split("-").map((p) => parseInt(p, 10));
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computePanelCoords(anchor: DOMRect): PanelCoords {
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const preferBelow =
    spaceBelow >= PANEL_HEIGHT || spaceBelow >= spaceAbove;

  let top = preferBelow
    ? anchor.bottom + 8
    : anchor.top - PANEL_HEIGHT - 8;

  top = Math.max(
    VIEWPORT_PAD,
    Math.min(top, window.innerHeight - PANEL_HEIGHT - VIEWPORT_PAD),
  );

  let left = anchor.left;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD),
  );

  return { top, left };
}

export function DatePopoverField({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: DatePopoverFieldProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      if (!buttonRef.current) return;
      setCoords(computePanelCoords(buttonRef.current.getBoundingClientRect()));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      try {
        input.showPicker?.();
      } catch {
        // showPicker may throw when not allowed; focus is enough.
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[80] rounded-2xl border border-cos-border bg-white p-3 shadow-[0_12px_32px_rgba(28,36,48,0.12)]"
            style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
            role="dialog"
            aria-label={`${label || "Date"} date picker`}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="date"
                className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
                value={value ?? ""}
                onChange={(e) => {
                  onChange(e.target.value || null);
                  if (e.target.value) setOpen(false);
                }}
              />
              {value ? (
                <button
                  type="button"
                  className="shrink-0 rounded-xl px-2 py-2 text-xs font-semibold text-cos-muted hover:text-cos-text"
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
    <div ref={rootRef} className={cn("block", className)}>
      {label ? (
        <span
          className={cn(
            "mb-1 block font-bold uppercase tracking-wide text-cos-muted",
            compact
              ? "text-[10px] tracking-[0.05em]"
              : "text-[11px] tracking-wide",
          )}
        >
          {label}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-cos-border bg-cos-card text-left font-normal normal-case tracking-normal text-cos-text transition disabled:opacity-40",
          compact ? "px-2 py-2 text-sm" : "px-2 py-1.5 text-xs",
          open
            ? "border-[#9eb6e8] shadow-[0_0_0_2px_rgba(158,182,232,0.35)]"
            : "hover:border-[#9eb6e8]",
          !value && "text-cos-muted",
        )}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-cos-muted" strokeWidth={2} />
        <span className="min-w-0 truncate">{formatDisplayDate(value)}</span>
      </button>
      {panel}
    </div>
  );
}
