"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { WorkloadBadge } from "@/components/communications-calendar/WorkloadBadge";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { getDaySummary, getMonthGridDates } from "@/lib/communications-calendar/workload";
import { cn } from "@/lib/utils/cn";
import { getTodayDateString } from "@/lib/utils/dates";
import type {
  CalendarMode,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CalendarMonthViewProps {
  data: CommunicationsCalendarData;
  mode: CalendarMode;
  year: number;
  month: number;
}

export function CalendarMonthView({
  data,
  mode,
  year,
  month,
}: CalendarMonthViewProps) {
  const today = getTodayDateString();
  const dates = getMonthGridDates(year, month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-cos-border bg-cos-bg">
        {weekdays.map((day) => (
          <div
            key={day}
            className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-cos-muted"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dateObj = new Date(`${date}T12:00:00`);
          const inMonth = dateObj.getMonth() === month;
          const summary = getDaySummary(data.daySummaries, date);
          const dayEvents = data.events.filter((entry) => entry.date === date);
          const dayComms = data.communications.filter((entry) => entry.dueDate === date);
          const dayDrafts = data.publishing.filter((entry) => entry.dueDate === date);
          const modeItems = getModeItems(data, mode, date);

          return (
            <div
              key={date}
              className={cn(
                "min-h-40 border-b border-r border-cos-border p-3 last:border-r-0",
                !inMonth && "bg-cos-bg/70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    date === today
                      ? "bg-cos-primary text-white"
                      : inMonth
                        ? "text-cos-text"
                        : "text-cos-dark-muted",
                  )}
                >
                  {dateObj.getDate()}
                </span>
                <WorkloadBadge level={summary.workload} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-cos-muted">
                <span>{summary.eventCount} events</span>
                <span>·</span>
                <span>{summary.communicationCount} comms</span>
                <span>·</span>
                <span>{summary.draftCount} drafts</span>
              </div>

              <div className="mt-3 space-y-2">
                {modeItems.slice(0, 3).map((item) => (
                  <CalendarMonthItem key={item.id} item={item} mode={mode} />
                ))}
                {modeItems.length > 3 && (
                  <p className="text-xs font-medium text-cos-accent">
                    +{modeItems.length - 3} more
                  </p>
                )}
              </div>

              {(dayEvents.length > 0 || dayComms.length > 0 || dayDrafts.length > 0) &&
                modeItems.length === 0 && (
                  <p className="mt-3 text-xs text-cos-muted">Nothing in this view right now.</p>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ModeItem {
  id: string;
  eventId: string;
  label: string;
  channel?: string;
  status?: string;
  kind: CalendarMode;
  communicationStrategy?: CommunicationStrategy;
}

function getModeItems(
  data: CommunicationsCalendarData,
  mode: CalendarMode,
  date: string,
): ModeItem[] {
  switch (mode) {
    case "events":
      return data.events
        .filter((entry) => entry.date === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          label: entry.title,
          status: entry.status,
          communicationStrategy: entry.communicationStrategy,
          kind: mode,
        }));
    case "communications":
      return data.communications
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          label: entry.stepTitle,
          channel: entry.channel,
          status: entry.status,
          kind: mode,
        }));
    case "publishing":
      return data.publishing
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          label: entry.stepTitle ?? "Draft",
          channel: entry.channel,
          status: entry.status,
          kind: mode,
        }));
    case "approvals":
      return data.approvals
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          label: entry.channel,
          status: entry.status,
          kind: mode,
        }));
  }
}

function CalendarMonthItem({
  item,
  mode,
}: {
  item: ModeItem;
  mode: CalendarMode;
}) {
  return (
    <Link
      href={`/events/${item.eventId}`}
      className="group block cursor-grab rounded-lg border border-cos-border bg-cos-bg px-2.5 py-2 transition-colors hover:border-cos-border hover:bg-cos-accent-soft/60"
      title="Drag to reschedule (coming soon)"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cos-border group-hover:text-cos-accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-cos-text">{item.label}</p>
          {item.communicationStrategy && item.kind === "events" && (
            <CommunicationStrategyBadge
              strategy={item.communicationStrategy}
              className="mt-1 !px-1.5 !py-0 !text-[9px]"
            />
          )}
          {item.channel && (
            <p className="mt-0.5 truncate text-[11px] text-cos-muted">
              {CHANNEL_LABELS[item.channel] ?? item.channel}
            </p>
          )}
          {mode === "approvals" && (
            <Badge variant="warning" className="mt-1">
              Preview
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
