"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generateEventBriefAction } from "@/lib/ai/actions";
import type { EventBriefInput } from "@/lib/ai/types";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface EventBriefDescriptionSectionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  getBriefInput: () => EventBriefInput;
  eventId?: string | null;
  disabled?: boolean;
  required?: boolean;
  textareaId?: string;
  hint?: string;
}

export function EventBriefDescriptionSection({
  description,
  onDescriptionChange,
  getBriefInput,
  eventId = null,
  disabled = false,
  required = false,
  textareaId = "event-description",
  hint = "Add rough notes. Hey Ralli can turn them into a clear event brief for future drafts.",
}: EventBriefDescriptionSectionProps) {
  const [isGeneratingBrief, startBriefTransition] = useTransition();
  const [briefError, setBriefError] = useState<string | null>(null);
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);

  function handleDescriptionChange(value: string) {
    setBriefError(null);
    setGeneratedBrief(null);
    onDescriptionChange(value);
  }

  function handleGenerateBrief() {
    setBriefError(null);
    setGeneratedBrief(null);

    startBriefTransition(async () => {
      const result = await generateEventBriefAction(getBriefInput(), eventId);

      if (!result.success || !result.brief) {
        setBriefError(result.error ?? "Unable to generate event brief.");
        return;
      }

      setGeneratedBrief(result.brief);
    });
  }

  function handleUseBrief() {
    if (!generatedBrief) return;
    onDescriptionChange(generatedBrief);
    setGeneratedBrief(null);
    setBriefError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={textareaId} className="block text-sm font-medium text-cos-text">
          Description
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || isGeneratingBrief}
          onClick={handleGenerateBrief}
        >
          <Sparkles className="h-4 w-4" />
          {isGeneratingBrief ? "Generating…" : "Generate event brief"}
        </Button>
      </div>
      <Textarea
        id={textareaId}
        name="description"
        value={description}
        onChange={(changeEvent) => handleDescriptionChange(changeEvent.target.value)}
        rows={4}
        required={required}
        placeholder="Describe the event, goals, and key messaging points..."
        hint={hint}
      />
      {briefError && (
        <p className="text-sm text-red-600" role="alert">
          {briefError}
        </p>
      )}
      {generatedBrief && (
        <div className="rounded-xl border border-cos-border bg-cos-bg/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            Suggested event brief
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
            {generatedBrief}
          </p>
          <p className="mt-2 text-xs text-cos-muted">
            Internal planning copy — not a parent-facing message. Review before using.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleUseBrief}
              disabled={disabled}
            >
              Use this brief
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGeneratedBrief(null)}
              disabled={disabled}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
