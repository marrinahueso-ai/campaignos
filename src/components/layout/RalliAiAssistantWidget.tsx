"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RalliAiAssistantWidgetProps {
  compact?: boolean;
}

const RalliAiAssistantDialog = dynamic(
  () =>
    import("@/components/layout/RalliAiAssistantDialog").then(
      (mod) => mod.RalliAiAssistantDialog,
    ),
  { ssr: false },
);

/**
 * Ask Ralli entry (Help Center). Dialog + ask logic load only when opened.
 */
export function RalliAiAssistantWidget({
  compact = false,
}: RalliAiAssistantWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        <button
          type="button"
          title="Hey Ralli Assistant"
          aria-label="Hey Ralli Assistant"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-cos-accent/25 bg-cos-accent-soft/70 transition-colors hover:bg-cos-accent-soft"
        >
          <Sparkles className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
        </button>
      ) : (
        <div className="rounded-[12px] border border-cos-border bg-cos-card p-4 shadow-[0_1px_2px_rgba(42,38,34,0.04)]">
          <div className="flex items-center gap-2">
            <Sparkles
              className="h-4 w-4 shrink-0 text-cos-brand-navy"
              strokeWidth={1.5}
            />
            <h3 className="font-display text-base text-cos-brand-navy">
              Hey Ralli Assistant
            </h3>
            <span className="rounded-full bg-cos-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f6f2eb] uppercase">
              Ask
            </span>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-cos-muted">
            Ask for today’s org briefing, what’s next on an event, writing help
            for reminders or captions, or how to navigate Hey Ralli — not AI
            Brain training.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "mt-4 flex w-full items-center justify-center rounded-[10px] border border-cos-accent/20",
              "bg-cos-accent px-4 py-2.5 text-sm font-semibold text-[#f6f2eb] transition-colors hover:bg-cos-accent/90",
            )}
          >
            Ask Ralli →
          </button>
        </div>
      )}

      {open ? <RalliAiAssistantDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
