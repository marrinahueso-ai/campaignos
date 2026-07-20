"use client";

import { Info, Lightbulb } from "lucide-react";
import { useState } from "react";
import { InsightsRecommendationsDrawer } from "@/components/insights/InsightsRecommendationsDrawer";
import { Button } from "@/components/ui/Button";
import type { InsightsRecommendation } from "@/lib/insights/types";

interface InsightsRecommendationsFooterProps {
  recommendation: InsightsRecommendation | null;
  /** Soft sync note (e.g. partial post metrics) — shown inline, not as a page banner. */
  dataNote?: string | null;
  pageName?: string | null;
}

/** Rule-based summary from synced Meta metrics (not LLM-generated). */
export function InsightsRecommendationsFooter({
  recommendation,
  dataNote = null,
  pageName = null,
}: InsightsRecommendationsFooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!recommendation && !dataNote) {
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

        {dataNote ? (
          <p
            className={
              recommendation
                ? "mt-3 flex items-start gap-2 border-t border-cos-border pt-3 text-xs leading-relaxed text-cos-muted"
                : "flex items-start gap-2 text-xs leading-relaxed text-cos-muted"
            }
            role="status"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cos-accent" strokeWidth={1.75} />
            <span>
              {dataNote}
              {pageName ? (
                <span className="text-cos-muted/80"> · {pageName}</span>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>

      {recommendation ? (
        <InsightsRecommendationsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          recommendation={recommendation}
          dataNote={dataNote}
          pageName={pageName}
        />
      ) : null}
    </>
  );
}
