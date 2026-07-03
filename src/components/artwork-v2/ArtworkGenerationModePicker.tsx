"use client";

import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";
import { cn } from "@/lib/utils/cn";

interface ArtworkGenerationModePickerProps {
  value: ArtworkGenerationMode;
  onChange: (mode: ArtworkGenerationMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

const MODES: ArtworkGenerationMode[] = ["quick", "refined"];

export function ArtworkGenerationModePicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: ArtworkGenerationModePickerProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="cos-section-title">How would you like to generate?</legend>
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {MODES.map((mode) => {
          const copy = ARTWORK_GENERATION_MODE_COPY[mode];
          const selected = value === mode;

          return (
            <label
              key={mode}
              className={cn(
                "flex cursor-pointer flex-col border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-cos-primary bg-cos-info/40 ring-1 ring-cos-primary/30"
                  : "border-cos-border bg-cos-card hover:border-cos-primary/30 hover:bg-cos-bg/60",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="artwork-generation-mode"
                  value={mode}
                  checked={selected}
                  onChange={() => onChange(mode)}
                  className="mt-1 shrink-0 accent-cos-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-cos-text">{copy.title}</span>
                    <span className="text-xs text-cos-muted">
                      {copy.timing} · {mode === "quick" ? "1 option" : "2 options"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-cos-muted">
                    {copy.detail}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
