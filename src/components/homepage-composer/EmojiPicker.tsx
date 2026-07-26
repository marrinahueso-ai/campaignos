"use client";

import { HOMEPAGE_EMOJI_OPTIONS } from "@/lib/homepage-composer/emoji";
import { cn } from "@/lib/utils/cn";
import { useEffect, useRef, useState } from "react";

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
};

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl border-2 bg-cos-card text-xl transition",
          open
            ? "border-[#9eb6e8] shadow-[0_0_0_2px_rgba(158,182,232,0.35)]"
            : "border-cos-border hover:border-[#9eb6e8]",
        )}
        aria-label="Pick emoji"
        aria-expanded={open}
      >
        {value || "🔗"}
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-[240px] rounded-2xl border border-cos-border bg-cos-card p-2 shadow-[0_12px_32px_rgba(28,36,48,0.12)]">
          <div className="grid grid-cols-6 gap-1.5">
            {HOMEPAGE_EMOJI_OPTIONS.map((emoji) => {
              const selected = emoji === value;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-lg transition",
                    selected
                      ? "border-2 border-[#9eb6e8] bg-[#eef3fc]"
                      : "border-2 border-transparent hover:bg-cos-bg-alt",
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
