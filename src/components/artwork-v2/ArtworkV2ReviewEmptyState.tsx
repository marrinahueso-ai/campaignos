"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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
    <Card padding="lg">
      <CardHeader className="items-center text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-cos-border bg-cos-bg">
          <ImageIcon className="h-8 w-8 text-cos-muted" aria-hidden />
        </div>
        <CardTitle className="mt-4">
          {isExhausted
            ? "No versions left"
            : "No artwork generated yet"}
        </CardTitle>
        <CardDescription>
          {isExhausted
            ? "Try generating again with a refined mode or edit your prompt."
            : "Generate artwork from your prompt to review versions here."}
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button type="button" size="lg" onClick={onGenerate}>
          {isExhausted ? "Back to create" : "Generate artwork"}
        </Button>
        {isExhausted && lastGenerationMode === "quick" && onRegenerate && (
          <Button type="button" size="lg" variant="secondary" onClick={() => onRegenerate("refined")}>
            Generate {ARTWORK_GENERATION_MODE_COPY.refined.title.toLowerCase()}
          </Button>
        )}
      </div>
    </Card>
  );
}
