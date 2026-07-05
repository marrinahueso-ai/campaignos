"use client";

import { cn } from "@/lib/utils/cn";
import type { MondayTimelineValue } from "@/lib/monday/types";

interface MondayTimelineBarProps {
  timeline: MondayTimelineValue | null;
  className?: string;
}

function formatShortDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MondayTimelineBar({ timeline, className }: MondayTimelineBarProps) {
  if (!timeline?.from && !timeline?.to) {
    return <span className="text-xs text-cos-muted">—</span>;
  }

  const from = formatShortDate(timeline.from);
  const to = formatShortDate(timeline.to);
  const label = from && to ? `${from} – ${to}` : from || to;

  return (
    <div className={cn("min-w-[7rem]", className)}>
      <div className="relative h-5 overflow-hidden rounded-sm bg-cos-accent-soft">
        <div className="absolute inset-y-0 left-0 w-full rounded-sm bg-gradient-to-r from-cos-accent/70 to-cos-accent" />
      </div>
      <p className="mt-1 truncate text-[10px] text-cos-muted">{label}</p>
    </div>
  );
}
