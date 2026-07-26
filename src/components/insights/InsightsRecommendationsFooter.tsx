"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { InsightsRecommendationsDrawer } from "@/components/insights/InsightsRecommendationsDrawer";
import { Button } from "@/components/ui/Button";
import type { InsightsRecommendation } from "@/lib/insights/types";

interface InsightsRecommendationsFooterProps {
  recommendation: InsightsRecommendation | null;
}

/** Rule-based summary from synced Meta metrics (not LLM-generated). */
export function InsightsRecommendationsFooter({
  recommendation,
}: InsightsRecommendationsFooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!recommendation) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-cos-border bg-cos-card px-5 py-4 shadow-sm">
        {recommendation ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cos-accent-soft)] text-[var(--cos-warning-text)]">
                <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-cos-muted">
                  From your metrics
                </p>
                <p className="mt-1 text-sm leading-relaxed text-cos-text">
                  {recommendation.summary}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 self-start sm:self-center"
              onClick={() => setDrawerOpen(true)}
            >
              View details
            </Button>
          </div>
        ) : null}
      </div>

      <InsightsRecommendationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recommendation={recommendation}
      />
    </>
  );
}
