"use client";

import { cn } from "@/lib/utils/cn";
import dynamic from "next/dynamic";
import { Theme, type EmojiClickData } from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";

const FullEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-[300px] items-center justify-center rounded-xl border border-cos-border bg-white text-xs text-cos-muted">
      Loading emoji…
    </div>
  ),
});

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
        <div
          className="absolute left-0 z-50 mt-2 rounded-2xl border border-cos-border bg-white shadow-[0_12px_32px_rgba(28,36,48,0.12)]"
          role="dialog"
          aria-label="Emoji picker"
        >
          <FullEmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) => {
              onChange(emojiData.emoji);
              setOpen(false);
            }}
            theme={Theme.LIGHT}
            width={300}
            height={360}
            searchPlaceHolder="Search emoji"
            previewConfig={{ showPreview: false }}
          />
        </div>
      ) : null}
    </div>
  );
}
