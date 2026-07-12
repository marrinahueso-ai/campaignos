"use client";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CompletionBannerProps {
  completedMilestoneName: string;
  nextMilestoneName: string | null;
  onGenerateNext: () => void;
  isGenerating: boolean;
}

export function CompletionBanner({
  completedMilestoneName,
  nextMilestoneName,
  onGenerateNext,
  isGenerating,
}: CompletionBannerProps) {
  if (!nextMilestoneName) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-cos-success/30 bg-cos-success/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div className="flex items-center gap-2 text-sm text-cos-text">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cos-success text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span>
          <strong>{completedMilestoneName}</strong> is complete! Generate{" "}
          <strong>{nextMilestoneName}</strong> next.
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={onGenerateNext}
        disabled={isGenerating}
      >
        Generate {nextMilestoneName}
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
