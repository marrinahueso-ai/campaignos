"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { ArtworkPlaceholder } from "@/components/campaign-builder-v2/ArtworkPlaceholder";
import { Button } from "@/components/ui/Button";

interface MilestoneEmptyStateProps {
  milestoneName: string;
  isGenerating: boolean;
  isFailed: boolean;
  errorMessage: string | null;
  onGenerate: () => void;
  onGoToInspiration?: () => void;
}

export function MilestoneEmptyState({
  milestoneName,
  isGenerating,
  isFailed,
  errorMessage,
  onGenerate,
  onGoToInspiration,
}: MilestoneEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16">
      <div className="w-full max-w-md">
        <ArtworkPlaceholder aspectClassName="aspect-square" />
      </div>
      <div className="max-w-sm text-center">
        <p className="font-display text-xl text-cos-text">
          {isGenerating ? `Generating ${milestoneName}…` : "No content yet"}
        </p>
        <p className="mt-2 text-sm text-cos-muted">
          {isGenerating
            ? "Artwork and captions are being created. You can work on other milestones while this finishes."
            : `Generate feed, story, and caption content for ${milestoneName}.`}
        </p>
      </div>

      {errorMessage && (
        <div
          className="flex max-w-md items-start gap-2 rounded border border-cos-warning/40 bg-cos-warning/10 px-4 py-3 text-sm text-cos-warning-text"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          <div>
            <p>{errorMessage}</p>
            {onGoToInspiration && (
              <button
                type="button"
                onClick={onGoToInspiration}
                className="mt-1 font-medium underline hover:no-underline"
              >
                Fix in Inspiration step
              </button>
            )}
          </div>
        </div>
      )}

      <Button onClick={onGenerate} disabled={isGenerating}>
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        {isGenerating
          ? "Generating…"
          : isFailed
            ? "Retry generation"
            : "Generate This Milestone"}
      </Button>
    </div>
  );
}
