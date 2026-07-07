"use client";

import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";
import { cn } from "@/lib/utils/cn";

interface ArtworkGenerationModeSectionProps {
  value: ArtworkGenerationMode;
  onChange: (mode: ArtworkGenerationMode) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  generateDisabled?: boolean;
  disabled?: boolean;
}

const MODES: ArtworkGenerationMode[] = ["quick", "refined"];

export function ArtworkGenerationModeSection({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  generateDisabled = false,
  disabled = false,
}: ArtworkGenerationModeSectionProps) {
  const copy = ARTWORK_GENERATION_MODE_COPY[value];

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="cos-section-title">How would you like to generate?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const modeCopy = ARTWORK_GENERATION_MODE_COPY[mode];
          const selected = value === mode;

          return (
            <label
              key={mode}
              className={cn(
                "flex cursor-pointer border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-cos-dark bg-cos-bg ring-1 ring-cos-dark/20"
                  : "border-cos-border bg-cos-card hover:border-cos-dark/30 hover:bg-cos-bg/60",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="artwork-campaign-generation-mode"
                  value={mode}
                  checked={selected}
                  onChange={() => onChange(mode)}
                  className="mt-1 shrink-0 accent-cos-dark"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-cos-text">{modeCopy.title}</span>
                    <span className="text-xs text-cos-muted">
                      {modeCopy.timing} · {mode === "quick" ? "1 option" : "2 options"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-cos-muted">
                    {modeCopy.detail}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        disabled={generateDisabled || isGenerating || disabled}
        onClick={onGenerate}
        className="inline-flex h-10 items-center bg-cos-dark px-5 text-sm font-medium text-[#f6f2eb] transition-colors hover:bg-cos-text disabled:pointer-events-none disabled:opacity-50"
      >
        {isGenerating
          ? "Generating artwork…"
          : `Generate ${copy.title.toLowerCase()}`}
      </button>
    </fieldset>
  );
}
