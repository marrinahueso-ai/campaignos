"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { InsightsRecommendation } from "@/lib/insights/types";

interface InsightsRecommendationsDrawerProps {
  open: boolean;
  onClose: () => void;
  recommendation: InsightsRecommendation;
}

export function InsightsRecommendationsDrawer({
  open,
  onClose,
  recommendation,
}: InsightsRecommendationsDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close recommendations drawer"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-cos-border bg-cos-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-cos-border px-6 py-5">
          <div>
            <p className="studio-eyebrow">Insights</p>
            <h2 className="font-display mt-1 text-3xl text-cos-text">Recommendations</h2>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              {recommendation.summary}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ul className="space-y-4">
            {recommendation.items.map((item) => (
              <li
                key={item.title}
                className="border border-cos-border bg-cos-bg px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cos-accent" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-cos-text">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-cos-muted">{item.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
