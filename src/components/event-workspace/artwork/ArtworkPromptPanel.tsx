"use client";

import { useRef, useState } from "react";
import { ChevronDown, CircleUser, Upload, X } from "lucide-react";
import { ArtworkGenerationModeButtons } from "@/components/event-workspace/artwork/ArtworkGenerationModeButtons";
import { ArtworkLogoPickerModal } from "@/components/event-workspace/artwork/ArtworkLogoPickerModal";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import type { ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import {
  buildLogoPromptHint,
  type SetupLogoOption,
} from "@/lib/artwork-v2/setup-logos";
import type { ArtworkV2Reference } from "@/lib/artwork-v2/types";
import { ARTWORK_FORMAT_OPTIONS } from "@/lib/artwork-v2/format-selection";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

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
  generationMode: ArtworkGenerationMode;
  onGenerationModeChange: (mode: ArtworkGenerationMode) => void;
  references: ArtworkV2Reference[];
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  setupLogos?: SetupLogoOption[];
  onGenerate: (mode: ArtworkGenerationMode) => void;
  isGenerating?: boolean;
  isReviewBusy?: boolean;
  inputsDisabled?: boolean;
}

function createReferenceId(): string {
  return crypto.randomUUID();
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
  setupLogos = [],
  onGenerate,
  isGenerating = false,
  isReviewBusy = false,
  inputsDisabled = false,
}: ArtworkPromptPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const atMaxReferences = references.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES;
  const hasPrompt = prompt.trim().length > 0;

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

  function handleAddLogoClick() {
    if (setupLogos.length === 0) {
      const hint = "Include the school or PTO logo in the design.";
      if (!prompt.trim()) {
        onPromptChange(hint);
        return;
      }
      if (!prompt.includes(hint)) {
        onPromptChange(`${prompt.trim()}\n\n${hint}`);
      }
      return;
    }

    if (setupLogos.length === 1) {
      applyLogoSelection(setupLogos[0]!);
      return;
    }

    setLogoPickerOpen(true);
  }

  function applyLogoSelection(logo: SetupLogoOption) {
    setLogoPickerOpen(false);
    const hint = buildLogoPromptHint(logo.label);

    if (!prompt.trim()) {
      onPromptChange(hint);
      return;
    }

    if (!prompt.includes(hint)) {
      onPromptChange(`${prompt.trim()}\n\n${hint}`);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        id="artwork-campaign-prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        rows={3}
        placeholder="Describe the artwork you want — style, colors, text, mood…"
        disabled={inputsDisabled}
        className="min-h-[88px] resize-y border-cos-border bg-cos-bg/40 text-sm leading-relaxed"
      />

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <ArtworkPromptSelect
          label="Format"
          value={format}
          options={ARTWORK_FORMAT_OPTIONS}
          onChange={onFormatChange}
          disabled={inputsDisabled}
        />
        <ArtworkPromptSelect
          label="Brand style"
          value={brandStyle}
          options={BRAND_STYLE_OPTIONS}
          onChange={onBrandStyleChange}
          disabled={inputsDisabled}
        />
        <ArtworkPromptSelect
          label="Color vibe"
          value={colorVibe}
          options={COLOR_VIBE_OPTIONS}
          onChange={onColorVibeChange}
          disabled={inputsDisabled}
        />

        <button
          type="button"
          disabled={inputsDisabled}
          onClick={handleAddLogoClick}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 border border-cos-border bg-cos-card px-2.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <CircleUser className="h-3.5 w-3.5" aria-hidden />
          Add logo
        </button>

        {!atMaxReferences && (
          <button
            type="button"
            disabled={inputsDisabled}
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

        <ArtworkGenerationModeButtons
          value={generationMode}
          onChange={onGenerationModeChange}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          isReviewBusy={isReviewBusy}
          hasPrompt={hasPrompt}
          className="ml-auto shrink-0"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleUploadChange}
      />

      {logoPickerOpen && setupLogos.length > 1 && (
        <ArtworkLogoPickerModal
          logos={setupLogos}
          onSelect={applyLogoSelection}
          onClose={() => setLogoPickerOpen(false)}
        />
      )}
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
