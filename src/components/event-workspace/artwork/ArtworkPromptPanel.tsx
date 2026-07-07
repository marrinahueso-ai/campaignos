"use client";

import { useRef } from "react";
import { ChevronDown, Sparkles, Upload, X } from "lucide-react";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";
import type { ArtworkV2Reference } from "@/lib/artwork-v2/types";
import { ARTWORK_FORMAT_OPTIONS } from "@/lib/artwork-v2/format-selection";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

const BRAND_STYLE_OPTIONS = ["Hey Ralli (Primary)", "School brand", "Minimal", "Bold"] as const;

const COLOR_VIBE_OPTIONS = [
  "Colorful & Playful",
  "Warm & Inviting",
  "Clean & Modern",
  "School spirit",
] as const;

const MODES: ArtworkGenerationMode[] = ["quick", "refined"];

interface ArtworkPromptPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  format: string;
  onFormatChange: (value: string) => void;
  brandStyle: string;
  onBrandStyleChange: (value: string) => void;
  colorVibe: string;
  onColorVibeChange: (value: string) => void;
  generationMode: ArtworkGenerationMode;
  onGenerationModeChange: (mode: ArtworkGenerationMode) => void;
  references: ArtworkV2Reference[];
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onGenerate: () => void;
  onApproveSelected?: () => void;
  hasSelection?: boolean;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  generateDisabled?: boolean;
  disabled?: boolean;
}

function createReferenceId(): string {
  return crypto.randomUUID();
}

function modeTooltip(mode: ArtworkGenerationMode): string {
  const copy = ARTWORK_GENERATION_MODE_COPY[mode];
  const optionCount = mode === "quick" ? "1 option" : "2 options";
  return `${copy.timing} · ${optionCount} — ${copy.detail}`;
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
  generationMode,
  onGenerationModeChange,
  references,
  onReferencesChange,
  onGenerate,
  onApproveSelected,
  hasSelection = false,
  isGenerating = false,
  isReviewBusy = false,
  generateDisabled = false,
  disabled = false,
}: ArtworkPromptPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atMaxReferences = references.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES;

  function revokeBlobPreview(reference: ArtworkV2Reference): void {
    if (reference.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(reference.previewUrl);
    }
  }

  function handleUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = ARTWORK_V2_MAX_INSPIRATION_IMAGES - references.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const uploadedReferences: ArtworkV2Reference[] = filesToAdd.map((file) => ({
      id: createReferenceId(),
      source: "upload",
      label: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    onReferencesChange([...references, ...uploadedReferences]);
    event.target.value = "";
  }

  function removeReference(referenceId: string) {
    const target = references.find((reference) => reference.id === referenceId);
    if (target) {
      revokeBlobPreview(target);
    }
    onReferencesChange(references.filter((reference) => reference.id !== referenceId));
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          id="artwork-campaign-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={3}
          placeholder="Describe the artwork you want — style, colors, text, mood…"
          disabled={disabled}
          className="min-h-[88px] resize-y border-cos-border bg-cos-bg/40 pr-4 pb-12 text-sm leading-relaxed"
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          {hasSelection && onApproveSelected && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isReviewBusy || disabled}
              onClick={onApproveSelected}
              className="h-8 px-3 text-xs"
            >
              {isReviewBusy ? "Saving…" : "Approve selected"}
            </Button>
          )}
          <button
            type="button"
            disabled={
              generateDisabled || isGenerating || isReviewBusy || !prompt.trim() || disabled
            }
            onClick={onGenerate}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 bg-cos-dark px-3 text-xs font-medium text-[#f6f2eb] transition-colors hover:bg-cos-text disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {isGenerating || isReviewBusy
              ? "Generating…"
              : hasSelection
                ? "Generate with my edits"
                : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <ArtworkPromptSelect
          label="Format"
          value={format}
          options={ARTWORK_FORMAT_OPTIONS}
          onChange={onFormatChange}
          disabled={disabled}
        />
        <ArtworkPromptSelect
          label="Brand style"
          value={brandStyle}
          options={BRAND_STYLE_OPTIONS}
          onChange={onBrandStyleChange}
          disabled={disabled}
        />
        <ArtworkPromptSelect
          label="Color vibe"
          value={colorVibe}
          options={COLOR_VIBE_OPTIONS}
          onChange={onColorVibeChange}
          disabled={disabled}
        />

        {!atMaxReferences && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 border border-cos-border bg-cos-card px-2.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Upload exported file
          </button>
        )}

        {references.map((reference) => (
          <div
            key={reference.id}
            className="group relative h-8 w-8 shrink-0 overflow-hidden border border-cos-border bg-[#f7f6f3]"
          >
            {reference.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reference.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
            <button
              type="button"
              onClick={() => removeReference(reference.id)}
              className="absolute inset-0 flex items-center justify-center bg-cos-dark/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${reference.label}`}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        ))}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {MODES.map((mode) => {
            const copy = ARTWORK_GENERATION_MODE_COPY[mode];
            const selected = generationMode === mode;

            return (
              <button
                key={mode}
                type="button"
                disabled={disabled}
                onClick={() => onGenerationModeChange(mode)}
                aria-pressed={selected}
                className={cn(
                  "group relative inline-flex h-8 items-center px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                  selected
                    ? "border border-cos-dark bg-cos-bg text-cos-text"
                    : "border border-cos-border bg-cos-card text-cos-muted hover:border-cos-dark/30 hover:bg-cos-bg/60 hover:text-cos-text",
                )}
              >
                {copy.title}
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleUploadChange}
      />
    </div>
  );
}

function ArtworkPromptSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="text-[11px] text-cos-muted">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-8 min-w-[7.5rem] appearance-none border border-cos-border bg-cos-card py-0 pr-7 pl-2 text-xs text-cos-text focus:border-cos-dark focus:outline-none disabled:opacity-50"
          aria-label={label}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-cos-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}
