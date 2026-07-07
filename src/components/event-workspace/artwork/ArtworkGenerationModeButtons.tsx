"use client";

import { Sparkles } from "lucide-react";
import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";
import { cn } from "@/lib/utils/cn";

const MODES: ArtworkGenerationMode[] = ["quick", "refined"];

interface ArtworkGenerationModeButtonsProps {
  value: ArtworkGenerationMode;
  onChange: (mode: ArtworkGenerationMode) => void;
  onGenerate: (mode: ArtworkGenerationMode) => void;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  hasPrompt?: boolean;
  className?: string;
}

function modeTooltip(mode: ArtworkGenerationMode): string {
  const copy = ARTWORK_GENERATION_MODE_COPY[mode];
  const optionCount = mode === "quick" ? "1 option" : "2 options";
  return `${copy.timing} · ${optionCount} — ${copy.detail}`;
}

export function ArtworkGenerationModeButtons({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  isReviewBusy = false,
  hasPrompt = false,
  className,
}: ArtworkGenerationModeButtonsProps) {
  function handleModeClick(mode: ArtworkGenerationMode) {
    onChange(mode);

    if (hasPrompt && !isReviewBusy && !isGenerating) {
      onGenerate(mode);
    }
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {MODES.map((mode) => {
        const copy = ARTWORK_GENERATION_MODE_COPY[mode];
        const selected = value === mode;
        const isPrimary = mode === "quick";
        const busy = isGenerating && selected;

        return (
          <button
            key={mode}
            type="button"
            disabled={isReviewBusy}
            onClick={() => handleModeClick(mode)}
            aria-pressed={selected}
            className={cn(
              "group relative inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              selected && isPrimary
                ? "border border-cos-dark bg-cos-dark text-[#f6f2eb] hover:bg-cos-text"
                : selected
                  ? "border border-cos-dark bg-cos-bg text-cos-text"
                  : isPrimary
                    ? "border border-cos-dark/40 bg-cos-card text-cos-text hover:border-cos-dark hover:bg-cos-bg/60"
                    : "border border-cos-border bg-cos-card text-cos-muted hover:border-cos-dark/30 hover:bg-cos-bg/60 hover:text-cos-text",
            )}
          >
            {selected && <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {busy ? "Generating…" : copy.title}
            <span
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-52 -translate-x-1/2 border border-cos-border bg-cos-card px-2 py-1.5 text-left text-[11px] leading-snug font-normal text-cos-text shadow-sm group-hover:block"
              role="tooltip"
            >
              {modeTooltip(mode)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
