"use client";

import { Sparkles } from "lucide-react";
import { MILESTONE_PLANNING_COLORS } from "@/components/event-workspace/plan/milestone-planning-utils";

interface MilestonePlanningSmartBannerProps {
  onApplySuggestedTimes?: () => void;
}

export function MilestonePlanningSmartBanner({
  onApplySuggestedTimes,
}: MilestonePlanningSmartBannerProps) {
  return (
    <div
      className="mt-6 flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      style={{ backgroundColor: MILESTONE_PLANNING_COLORS.suggestionBg }}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: MILESTONE_PLANNING_COLORS.suggestionText }}
          aria-hidden
        />
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: MILESTONE_PLANNING_COLORS.suggestionText }}
          >
            Smart suggestion
          </p>
          <p className="mt-0.5 text-sm" style={{ color: MILESTONE_PLANNING_COLORS.suggestionText }}>
            Based on similar campaigns, posting between 9–11 AM gets the most engagement.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onApplySuggestedTimes}
        className="inline-flex h-9 shrink-0 items-center justify-center border bg-white px-4 text-xs font-medium transition-colors hover:bg-white/80"
        style={{
          borderColor: MILESTONE_PLANNING_COLORS.suggestionText,
          color: MILESTONE_PLANNING_COLORS.suggestionText,
        }}
      >
        Apply all suggested times
      </button>
    </div>
  );
}
