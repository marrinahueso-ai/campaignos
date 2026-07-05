"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const LABEL_PALETTE: Record<string, string> = {
  low: "bg-cos-success-bg text-cos-success-text",
  high: "bg-cos-error-bg text-cos-error-text",
  done: "bg-cos-success-bg text-cos-success-text",
  "not started": "bg-cos-bg-alt text-cos-muted",
  "in progress": "bg-cos-warning text-cos-warning-text",
  "working on it": "bg-cos-warning text-cos-warning-text",
  stuck: "bg-cos-error-bg text-cos-error-text",
  blocked: "bg-cos-error-bg text-cos-error-text",
};

function paletteForLabel(label: string): string {
  const key = label.trim().toLowerCase();
  return LABEL_PALETTE[key] ?? "bg-cos-info text-cos-info-text";
}

interface MondayLabelPillProps {
  label: string | null;
  options?: string[];
  onChange?: (label: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function MondayLabelPill({
  label,
  options,
  onChange,
  disabled,
  className,
  placeholder = "—",
}: MondayLabelPillProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const display = label?.trim() || placeholder;

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (onChange && options && options.length > 0) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((value) => !value)}
          className={cn(
            "inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-opacity disabled:opacity-50",
            paletteForLabel(display),
            className,
          )}
        >
          {display}
        </button>
        {open && (
          <ul className="absolute left-0 top-full z-30 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-cos-border bg-cos-card py-1 shadow-lg">
            {options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (option !== label) {
                      onChange(option);
                    }
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-xs hover:bg-cos-bg"
                >
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 font-semibold",
                      paletteForLabel(option),
                    )}
                  >
                    {option}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        paletteForLabel(display),
        className,
      )}
    >
      {display}
    </span>
  );
}
