"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Send,
  type LucideIcon,
} from "lucide-react";
import { formatEventDate } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import { cn } from "@/lib/utils/cn";

const PREVIEW_LIMIT = 8;

const EMPTY_ICONS = {
  send: Send,
  clock: Clock,
  check: CheckCircle2,
} as const satisfies Record<string, LucideIcon>;

export type PublishingListEmptyIcon = keyof typeof EMPTY_ICONS;

interface PublishingItemListProps {
  items: PlanningCalendarItem[];
  emptyIcon: PublishingListEmptyIcon;
  emptyMessage: string;
  today: string;
}

export function PublishingItemList({
  items,
  emptyIcon,
  emptyMessage,
  today,
}: PublishingItemListProps) {
  const [showAll, setShowAll] = useState(false);
  const Icon = EMPTY_ICONS[emptyIcon];

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-cos-muted">
        <Icon className="h-4 w-4 shrink-0 opacity-60" />
        {emptyMessage}
      </p>
    );
  }

  const visibleItems = showAll ? items : items.slice(0, PREVIEW_LIMIT);
  const hiddenCount = items.length - PREVIEW_LIMIT;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {visibleItems.map((item) => {
          const isPast = item.scheduledDate < today;
          return (
            <li key={item.id}>
              <Link
                href={`/events/${item.eventId}#publish`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors",
                  isPast
                    ? "border-cos-border/50 bg-cos-bg/40 hover:bg-cos-bg/70"
                    : "border-cos-border hover:bg-cos-bg/50",
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isPast ? "text-cos-muted" : "text-cos-text",
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-cos-muted">{item.eventTitle}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    isPast ? "text-cos-muted/80" : "text-cos-muted",
                  )}
                >
                  {formatEventDate(item.scheduledDate)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cos-border py-2 text-xs font-medium text-cos-muted transition-colors hover:border-cos-text/20 hover:text-cos-text"
        >
          {showAll ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show fewer
            </>
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              View all {items.length} items
            </>
          )}
        </button>
      )}
    </div>
  );
}
