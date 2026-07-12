"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { InsightsRecommendationsDrawer } from "@/components/insights/InsightsRecommendationsDrawer";
import { Button } from "@/components/ui/Button";
import type { InsightsRecommendation } from "@/lib/insights/types";

interface InsightsAiFooterProps {
  recommendation: InsightsRecommendation | null;
}

export function InsightsAiFooter({ recommendation }: InsightsAiFooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!recommendation) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4 border border-cos-border bg-cos-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 text-cos-accent" strokeWidth={1.5} />
          <p className="text-sm leading-relaxed text-cos-text">{recommendation.summary}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          View Recommendations
        </Button>
      </div>

      <InsightsRecommendationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recommendation={recommendation}
      />
    </>
  );
}
