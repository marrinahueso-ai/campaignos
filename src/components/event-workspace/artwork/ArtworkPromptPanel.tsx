"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

const FORMAT_OPTIONS = [
  "Instagram Post (1:1)",
  "Instagram Story (9:16)",
  "Facebook Post (1:1)",
  "Facebook Story (9:16)",
] as const;

const BRAND_STYLE_OPTIONS = ["Hey Ralli (Primary)", "School brand", "Minimal", "Bold"] as const;

const COLOR_VIBE_OPTIONS = [
  "Colorful & Playful",
  "Warm & Inviting",
  "Clean & Modern",
  "School spirit",
] as const;

interface ArtworkPromptPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  format: string;
  onFormatChange: (value: string) => void;
  brandStyle: string;
  onBrandStyleChange: (value: string) => void;
  colorVibe: string;
  onColorVibeChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  generateDisabled?: boolean;
}

export function ArtworkPromptPanel({
  prompt,
  onPromptChange,
  format,
  onFormatChange,
  brandStyle,
  onBrandStyleChange,
  colorVibe,
  onColorVibeChange,
  onGenerate,
  isGenerating = false,
  generateDisabled = false,
}: ArtworkPromptPanelProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          id="artwork-campaign-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={6}
          placeholder="Describe the artwork you want — style, colors, text, mood…"
          className="min-h-[160px] resize-y border-cos-border bg-cos-bg/40 pr-28 pb-12 text-sm leading-relaxed"
        />
        <button
          type="button"
          disabled={generateDisabled || isGenerating || !prompt.trim()}
          onClick={onGenerate}
          className={cn(
            "absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 bg-cos-dark px-4 text-xs font-medium text-[#f6f2eb] transition-colors hover:bg-cos-text disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {isGenerating ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ArtworkPromptSelect
          label="Format"
          value={format}
          options={FORMAT_OPTIONS}
          onChange={onFormatChange}
        />
        <ArtworkPromptSelect
          label="Brand style"
          value={brandStyle}
          options={BRAND_STYLE_OPTIONS}
          onChange={onBrandStyleChange}
        />
        <ArtworkPromptSelect
          label="Color vibe"
          value={colorVibe}
          options={COLOR_VIBE_OPTIONS}
          onChange={onColorVibeChange}
        />
      </div>
    </div>
  );
}

function ArtworkPromptSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-cos-muted">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 min-w-[9rem] appearance-none border border-cos-border bg-cos-card py-0 pr-8 pl-3 text-xs text-cos-text focus:border-cos-dark focus:outline-none"
          aria-label={label}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}
