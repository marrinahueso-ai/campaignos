"use client";

import Link from "next/link";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

const PREVIEW_LIMIT = 5;

export function CalendarComingUpEase({
  upcomingItems,
  onSelectUpcomingItem,
}: {
  upcomingItems: PlanningCalendarItem[];
  onSelectUpcomingItem: (item: PlanningCalendarItem) => void;
}) {
  const previewItems = upcomingItems.slice(0, PREVIEW_LIMIT);

  return (
    <details
      className="mt-[18px] rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-4 py-3.5"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-cos-text [&::-webkit-details-marker]:hidden">
        <span>
          Coming up{" "}
          <span className="font-semibold text-cos-muted">
            Next 7 days · Events
          </span>
        </span>
        <span className="text-xs font-semibold text-cos-muted">
          {upcomingItems.length === 0 ? "None" : `${upcomingItems.length}`}
        </span>
      </summary>
      {upcomingItems.length === 0 ? (
        <p className="mt-3 text-sm text-cos-muted">
          No events in the next 7 days.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {previewItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectUpcomingItem(item)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3.5 py-2.5 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-bold text-cos-text">
                    {item.title}
                  </strong>
                  <span className="text-xs text-cos-muted">
                    {formatShortDate(item.scheduledDate)}
                  </span>
                </span>
                <span className="rounded-full bg-[rgba(47,74,60,0.12)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-[#2f4a3c] uppercase">
                  Event
                </span>
              </button>
            </li>
          ))}
          {upcomingItems.length > PREVIEW_LIMIT ? (
            <li>
              <Link
                href="/events"
                className="block rounded-2xl border border-dashed border-cos-border py-2 text-center text-xs font-bold text-cos-muted hover:text-cos-text"
              >
                View all on Events
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </details>
  );
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
