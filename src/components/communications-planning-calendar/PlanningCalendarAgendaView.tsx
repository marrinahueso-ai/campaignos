"use client";

import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import {
  DISPLAY_STATUS_LABELS,
  getDisplayStatus,
  isCampaignEventItem,
  isMetaMilestoneItem,
} from "@/lib/communications-calendar/unified-calendar-layers";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PlanningCalendarAgendaViewProps {
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[];
  onSelectItem: (item: PlanningCalendarItem) => void;
}

export function PlanningCalendarAgendaView({
  items,
  onSelectItem,
}: PlanningCalendarAgendaViewProps) {
  const today = getTodayDateString();
  const sorted = [...items].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );

  const grouped = sorted.reduce<
    Record<string, (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[]>
  >((acc, item) => {
    acc[item.scheduledDate] = acc[item.scheduledDate] ?? [];
    acc[item.scheduledDate].push(item);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-cos-text">
          Nothing on the agenda
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
          Turn on more layers or add events when you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        Agenda
      </p>
      <div className="flex flex-col gap-2.5">
        {dates.map((date) => {
          const isToday = date === today;
          return (
            <section
              key={date}
              className={cn(
                "rounded-[18px] border border-cos-border px-4 py-3.5",
                isToday
                  ? "bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  : "bg-[rgba(255,252,247,0.55)]",
              )}
            >
              <h3 className="mb-2.5 flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-cos-text">
                {formatAgendaDate(date)}
                {isToday ? (
                  <span className="rounded-full bg-[rgba(47,74,60,0.12)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-[#2f4a3c] uppercase">
                    Today
                  </span>
                ) : null}
              </h3>
              <div className="flex flex-col gap-1.5">
                {grouped[date].map((item) => {
                  const status = getDisplayStatus(item);
                  const isEvent = isCampaignEventItem(item);
                  const isPost = isMetaMilestoneItem(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3.5 py-2.5 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                    >
                      <span className="min-w-0">
                        <strong className="mb-0.5 block truncate text-sm font-bold text-cos-text">
                          {item.title}
                        </strong>
                        <span className="text-xs text-cos-muted">
                          {isEvent
                            ? "Event"
                            : isPost
                              ? "Post"
                              : "Item"}
                          {item.scheduledAt
                            ? ` · ${formatTime(item.scheduledAt)}`
                            : ""}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                          isEvent
                            ? "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]"
                            : status === "published"
                              ? "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]"
                              : "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
                        )}
                      >
                        {isEvent ? "Event" : DISPLAY_STATUS_LABELS[status]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function formatAgendaDate(date: string): string {
  return formatLocalDate(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
