"use client";

import { Sparkles } from "lucide-react";

interface MilestonePlanningSmartBannerProps {
  onApplySuggestedTimes?: () => void;
}

export function MilestonePlanningSmartBanner({
  onApplySuggestedTimes,
}: MilestonePlanningSmartBannerProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-cos-border bg-cos-status-todo-bg px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-2.5">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-cos-status-todo-text"
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-cos-status-todo-text">Smart suggestion</p>
          <p className="mt-0.5 text-sm text-cos-status-todo-text">
            Based on similar campaigns, posting between 9–11 AM gets the most engagement.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onApplySuggestedTimes}
        className="inline-flex h-9 shrink-0 items-center justify-center border border-cos-status-todo-text bg-cos-card px-4 text-xs font-medium text-cos-status-todo-text transition-colors hover:bg-cos-bg"
      >
        Apply all suggested times
      </button>
    </div>
  );
}
