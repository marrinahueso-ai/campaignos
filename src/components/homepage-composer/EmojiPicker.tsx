"use client";

import { cn } from "@/lib/utils/cn";
import dynamic from "next/dynamic";
import { Theme, type EmojiClickData } from "emoji-picker-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PICKER_WIDTH = 300;
const PICKER_HEIGHT = 360;
const VIEWPORT_PAD = 8;

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

type PanelCoords = {
  top: number;
  left: number;
};

function computePanelCoords(anchor: DOMRect): PanelCoords {
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const preferBelow =
    spaceBelow >= PICKER_HEIGHT || spaceBelow >= spaceAbove;

  let top = preferBelow
    ? anchor.bottom + 8
    : anchor.top - PICKER_HEIGHT - 8;

  top = Math.max(
    VIEWPORT_PAD,
    Math.min(top, window.innerHeight - PICKER_HEIGHT - VIEWPORT_PAD),
  );

  let left = anchor.left;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - PICKER_WIDTH - VIEWPORT_PAD),
  );

  return { top, left };
}

export function EmojiPicker({ value, onChange, label }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[80] rounded-2xl border border-cos-border bg-white shadow-[0_12px_32px_rgba(28,36,48,0.12)]"
            style={{ top: coords.top, left: coords.left }}
            role="dialog"
            aria-label="Emoji picker"
          >
            <FullEmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                onChange(emojiData.emoji);
                setOpen(false);
              }}
              theme={Theme.LIGHT}
              width={PICKER_WIDTH}
              height={PICKER_HEIGHT}
              searchPlaceHolder="Search emoji"
              previewConfig={{ showPreview: false }}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
          {label}
        </span>
      ) : null}
      <button
        ref={buttonRef}
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
      {panel}
    </div>
  );
}
