"use client";

import { useRef } from "react";
import { ReviewPublishPlatformCheckboxes } from "@/components/event-workspace/review-publish/ReviewPublishPlatformCheckboxes";
import {
  formatScheduleDateInput,
  type ReviewPublishTimingOption,
} from "@/components/event-workspace/review-publish/schedule-utils";
import type { ReviewPublishPlatformId } from "@/components/event-workspace/review-publish/ReviewPublishPlatformCheckboxes";
import { cn } from "@/lib/utils/cn";

interface ReviewPublishOptionsPanelProps {
  timingOption: ReviewPublishTimingOption;
  onTimingOptionChange: (option: ReviewPublishTimingOption) => void;
  bestTimeSuggestions: boolean;
  onBestTimeSuggestionsChange: (enabled: boolean) => void;
  publishPlatforms: Record<ReviewPublishPlatformId, boolean>;
  schedulePlatforms: Record<ReviewPublishPlatformId, boolean>;
  onPublishPlatformToggle: (id: ReviewPublishPlatformId) => void;
  onSchedulePlatformToggle: (id: ReviewPublishPlatformId) => void;
  platformsDisabled?: boolean;
  scheduleDate: string;
  scheduleTime: string;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
}

interface TimingOptionConfig {
  id: ReviewPublishTimingOption;
  title: string;
  description: string;
}

const TIMING_OPTIONS: TimingOptionConfig[] = [
  {
    id: "now",
    title: "Publish now",
    description: "Publish immediately to your selected platforms.",
  },
  {
    id: "schedule",
    title: "Schedule for later",
    description: "Choose a date and time to publish.",
  },
  {
    id: "draft",
    title: "Save as draft",
    description: "Save and come back to publish later.",
  },
];

export function ReviewPublishOptionsPanel({
  timingOption,
  onTimingOptionChange,
  bestTimeSuggestions,
  onBestTimeSuggestionsChange,
  publishPlatforms,
  schedulePlatforms,
  onPublishPlatformToggle,
  onSchedulePlatformToggle,
  platformsDisabled = false,
  scheduleDate,
  scheduleTime,
  onScheduleDateChange,
  onScheduleTimeChange,
}: ReviewPublishOptionsPanelProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="border border-cos-border bg-cos-card p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="cos-section-title">Choose when &amp; where</p>
        <label className="inline-flex items-center gap-2.5">
          <span className="text-xs text-cos-muted">Best time suggestions</span>
          <button
            type="button"
            role="switch"
            aria-checked={bestTimeSuggestions}
            aria-label="Best time suggestions"
            onClick={() => onBestTimeSuggestionsChange(!bestTimeSuggestions)}
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              bestTimeSuggestions ? "bg-cos-success" : "bg-cos-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                bestTimeSuggestions && "translate-x-4",
              )}
              aria-hidden
            />
          </button>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {TIMING_OPTIONS.map((option) => {
          const selected = timingOption === option.id;

          return (
            <div
              key={option.id}
              className={cn(
                "rounded-sm border px-4 py-3.5 transition-colors",
                selected
                  ? "border-cos-border bg-cos-bg/60"
                  : "border-cos-border bg-cos-card",
              )}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="review-publish-timing"
                  checked={selected}
                  onChange={() => onTimingOptionChange(option.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-cos-dark"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-cos-text">{option.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-cos-muted">
                    {option.description}
                  </span>
                </span>
              </label>

              {option.id === "now" && selected && (
                <div className="mt-3 pl-7">
                  <ReviewPublishPlatformCheckboxes
                    platforms={publishPlatforms}
                    onToggle={onPublishPlatformToggle}
                    disabled={platformsDisabled}
                  />
                </div>
              )}

              {option.id === "schedule" && selected && (
                <div className="mt-3 space-y-3 pl-7">
                  <div className="flex flex-wrap gap-2">
                    <div className="relative inline-flex min-w-[9rem] flex-1">
                      <button
                        type="button"
                        onClick={() => dateInputRef.current?.showPicker?.()}
                        className="flex w-full items-center rounded-sm border border-cos-border bg-cos-card px-3 py-2 text-left text-sm text-cos-text transition-colors hover:bg-cos-bg"
                      >
                        {formatScheduleDateInput(scheduleDate)}
                      </button>
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={scheduleDate}
                        onChange={(event) => onScheduleDateChange(event.target.value)}
                        className="sr-only"
                        aria-label="Schedule date"
                      />
                    </div>
                    <label className="inline-flex min-w-[7rem] items-center rounded-sm border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text">
                      <span className="sr-only">Schedule time</span>
                      <input
                        type="text"
                        value={scheduleTime}
                        onChange={(event) => onScheduleTimeChange(event.target.value)}
                        placeholder="10:00 AM"
                        className="w-full bg-transparent text-sm text-cos-text outline-none"
                      />
                    </label>
                  </div>
                  <ReviewPublishPlatformCheckboxes
                    platforms={schedulePlatforms}
                    onToggle={onSchedulePlatformToggle}
                    disabled={platformsDisabled}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
