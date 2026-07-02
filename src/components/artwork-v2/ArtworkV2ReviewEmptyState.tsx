"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ARTWORK_GENERATION_MODE_COPY,
  type ArtworkGenerationMode,
} from "@/lib/artwork-v2/generation-mode";

interface ArtworkV2ReviewEmptyStateProps {
  variant?: "initial" | "exhausted";
  lastGenerationMode?: ArtworkGenerationMode;
  onGenerate: () => void;
  onRegenerate?: (mode: ArtworkGenerationMode) => void;
}

export function ArtworkV2ReviewEmptyState({
  variant = "initial",
  lastGenerationMode = "quick",
  onGenerate,
  onRegenerate,
}: ArtworkV2ReviewEmptyStateProps) {
  const isExhausted = variant === "exhausted";

  return (
    <div className="flex min-h-[min(calc(100dvh-14rem),480px)] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-3xl bg-gradient-to-br from-[#eef2f0] via-[#f7f3ed] to-[#e9e3da] p-8 shadow-inner">
        <ImageIcon className="h-14 w-14 text-cos-muted/70 stroke-[1.25]" aria-hidden />
      </div>
      <p className="mt-6 text-base font-medium text-cos-text">
        {isExhausted
          ? "No versions left. Try generating again."
          : "No artwork has been generated yet."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="lg" onClick={onGenerate}>
          {isExhausted ? "Back to create" : "Generate artwork"}
        </Button>
        {isExhausted && lastGenerationMode === "quick" && onRegenerate && (
          <Button type="button" size="lg" variant="secondary" onClick={() => onRegenerate("refined")}>
            Generate {ARTWORK_GENERATION_MODE_COPY.refined.title.toLowerCase()}
          </Button>
        )}
      </div>
    </div>
  );
}
