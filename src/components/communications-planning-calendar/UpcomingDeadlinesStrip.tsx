"use client";

import { AlarmClock } from "lucide-react";
import {
  DISPLAY_STATUS_LABELS,
  DISPLAY_STATUS_STYLES,
  getDisplayStatus,
  getPrimaryChannelLabel,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface UpcomingDeadlinesStripProps {
  items: PlanningCalendarItem[];
  onSelectItem: (item: PlanningCalendarItem) => void;
}

export function UpcomingDeadlinesStrip({
  items,
  onSelectItem,
}: UpcomingDeadlinesStripProps) {
  if (items.length === 0) {
    return (
      <div className="border border-cos-border bg-cos-card px-5 py-4">
        <p className="text-sm text-cos-muted">You&apos;re clear for the next 7 days.</p>
      </div>
    );
  }

  return (
    <div className="border border-cos-border bg-cos-card">
      <div className="flex items-center gap-2 border-b border-cos-border px-5 py-3">
        <AlarmClock className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
        <h2 className="font-display text-lg text-cos-text">Next 7 days</h2>
        <span className="text-xs text-cos-dark-muted">{items.length} upcoming</span>
      </div>

      <div className="flex gap-3 overflow-x-auto p-4">
        {items.map((item) => {
          const displayStatus = getDisplayStatus(item);
          const statusStyles = DISPLAY_STATUS_STYLES[displayStatus];
          const channelLabel = getPrimaryChannelLabel(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className={cn(
                "min-w-[200px] shrink-0 border p-3 text-left transition-shadow hover:shadow-md",
                statusStyles.bg,
                statusStyles.border,
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-cos-muted">
                {formatShortDate(item.scheduledDate)}
              </p>
              <p className={cn("mt-1 truncate text-sm font-semibold", statusStyles.text)}>
                {item.title}
              </p>
              <p className="mt-1 truncate text-xs text-cos-muted">{item.eventTitle}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {channelLabel && (
                  <span className="rounded-full bg-cos-card/80 px-2 py-0.5 text-[10px] font-medium text-cos-muted">
                    {channelLabel}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    statusStyles.bg,
                    statusStyles.text,
                  )}
                >
                  {DISPLAY_STATUS_LABELS[displayStatus]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
