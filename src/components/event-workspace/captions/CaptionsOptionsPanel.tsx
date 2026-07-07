"use client";

import { useState } from "react";
import {
  ChevronDown,
  MoreVertical,
  Pencil,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { MetaCaptionGenerationOptions } from "@/lib/meta-captions/types";
import { cn } from "@/lib/utils/cn";

export interface CaptionOption {
  id: string;
  text: string;
}

const TONE_OPTIONS = ["Friendly", "Professional", "Enthusiastic", "Concise"] as const;
const LENGTH_OPTIONS = ["Short", "Medium", "Long"] as const;

type CaptionTone = (typeof TONE_OPTIONS)[number];
type CaptionLength = (typeof LENGTH_OPTIONS)[number];

interface CaptionsOptionsPanelProps {
  options: CaptionOption[];
  selectedOptionId: string | null;
  tone: CaptionTone;
  length: CaptionLength;
  onToneChange: (tone: CaptionTone) => void;
  onLengthChange: (length: CaptionLength) => void;
  onSelectOption: (id: string) => void;
  onSaveOption: (id: string, text: string) => void;
  onUseOption: (id: string) => void;
  onRegenerateAll: (options: MetaCaptionGenerationOptions) => void;
  onGenerateMore: (options: MetaCaptionGenerationOptions) => void;
  isRegenerating?: boolean;
  isGeneratingMore?: boolean;
  isSavingOption?: boolean;
  savingOptionId?: string | null;
  usingOptionId?: string | null;
  aiAvailable?: boolean;
  aiUnavailableReason?: string | null;
}

export function CaptionsOptionsPanel({
  options,
  selectedOptionId,
  tone,
  length,
  onToneChange,
  onLengthChange,
  onSelectOption,
  onSaveOption,
  onUseOption,
  onRegenerateAll,
  onGenerateMore,
  isRegenerating = false,
  isGeneratingMore = false,
  isSavingOption = false,
  savingOptionId = null,
  usingOptionId = null,
  aiAvailable = true,
  aiUnavailableReason = null,
}: CaptionsOptionsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);

  function startEdit(option: CaptionOption) {
    setEditingId(option.id);
    setEditDraft(option.text);
  }

  function commitEdit(optionId: string) {
    const trimmed = editDraft.trim();
    if (trimmed) {
      onSaveOption(optionId, trimmed);
    }
    setEditingId(null);
    setEditDraft("");
  }

  async function copyOptionText(option: CaptionOption) {
    try {
      await navigator.clipboard.writeText(option.text);
      setCopyFeedbackId(option.id);
      window.setTimeout(() => setCopyFeedbackId(null), 2000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  const generationOptions: MetaCaptionGenerationOptions = { tone, length };

  return (
    <div className="border border-cos-border bg-cos-card p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="cos-section-title">AI-generated captions</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
            <Sparkles className="h-3 w-3" aria-hidden />
            Powered by AI
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ToneLengthSelect
            label="Tone"
            value={tone}
            options={TONE_OPTIONS}
            onChange={(value) => onToneChange(value as CaptionTone)}
          />
          <ToneLengthSelect
            label="Length"
            value={length}
            options={LENGTH_OPTIONS}
            onChange={(value) => onLengthChange(value as CaptionLength)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 px-3"
            disabled={!aiAvailable || isRegenerating}
            onClick={() => onRegenerateAll(generationOptions)}
            title={aiAvailable ? undefined : (aiUnavailableReason ?? undefined)}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
              aria-hidden
            />
            Regenerate all
          </Button>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          const isEditing = editingId === option.id;
          const charCount = option.text.length;

          return (
            <li
              key={option.id}
              className="border border-cos-border bg-cos-card p-4"
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  className="mt-1 shrink-0"
                  onClick={() => onSelectOption(option.id)}
                  aria-label={isSelected ? "Selected caption" : "Select caption"}
                  aria-pressed={isSelected}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2",
                      isSelected
                        ? "border-cos-dark bg-cos-dark"
                        : "border-cos-border bg-cos-card",
                    )}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                    )}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      rows={5}
                      className="min-h-[120px] w-full text-sm leading-6"
                      autoFocus
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Sparkles
                        className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
                        aria-hidden
                      />
                      <p className="min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-wrap text-cos-text">
                        {option.text}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-cos-muted">
                      {charCount} characters
                      <span className="mx-1.5 text-cos-border">·</span>
                      <span className="text-cos-success-text">Good engagement</span>
                    </p>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3"
                            disabled={!editDraft.trim() || isSavingOption}
                            onClick={() => commitEdit(option.id)}
                          >
                            {savingOptionId === option.id && isSavingOption ? "Saving…" : "Save"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3"
                            onClick={() => startEdit(option)}
                          >
                            <Pencil className="h-3 w-3" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3"
                            disabled={isSavingOption}
                            onClick={() => onUseOption(option.id)}
                          >
                            {usingOptionId === option.id && isSavingOption ? "Using…" : "Use"}
                          </Button>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-sm text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
                            aria-label={
                              copyFeedbackId === option.id
                                ? "Caption copied"
                                : "Copy caption to clipboard"
                            }
                            title={
                              copyFeedbackId === option.id ? "Copied!" : "Copy caption"
                            }
                            onClick={() => copyOptionText(option)}
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {options.length === 0 && (
        <p className="mt-5 text-sm text-cos-muted">
          No caption options yet. Generate options to get started.
        </p>
      )}

      <button
        type="button"
        className="mt-4 inline-flex h-9 items-center gap-1.5 border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50"
        disabled={!aiAvailable || isGeneratingMore}
        onClick={() => onGenerateMore(generationOptions)}
        title={aiAvailable ? undefined : (aiUnavailableReason ?? undefined)}
      >
        {isGeneratingMore ? "Generating…" : "+ Generate more options"}
      </button>
    </div>
  );
}

function ToneLengthSelect({
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
          className="h-9 min-w-[5.5rem] appearance-none rounded-sm border border-cos-border bg-cos-card py-0 pr-8 pl-3 text-xs text-cos-text focus:border-cos-dark focus:outline-none"
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
