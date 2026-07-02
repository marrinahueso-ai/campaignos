"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkloadBadge } from "@/components/communications-calendar/WorkloadBadge";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { getDaySummary, getWeekDates } from "@/lib/communications-calendar/workload";
import { formatEventDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type {
  CalendarMode,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";

interface CalendarWeekViewProps {
  data: CommunicationsCalendarData;
  mode: CalendarMode;
  anchorDate: string;
}

export function CalendarWeekView({ data, mode, anchorDate }: CalendarWeekViewProps) {
  const today = getTodayDateString();
  const dates = getWeekDates(anchorDate);

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {dates.map((date) => {
        const summary = getDaySummary(data.daySummaries, date);
        const items = getWeekItems(data, mode, date);

        return (
          <div
            key={date}
            className={cn(
              "rounded-2xl border border-cos-border bg-white p-4 shadow-sm",
              date === today && "ring-2 ring-cos-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                  {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </p>
                <p className="mt-1 text-sm font-semibold text-cos-text">
                  {formatEventDate(date)}
                </p>
              </div>
              <WorkloadBadge level={summary.workload} />
            </div>

            <div className="mt-4 space-y-3">
              {items.length === 0 ? (
                <p className="rounded-xl bg-cos-bg px-3 py-6 text-center text-sm text-cos-dark-muted">
                  Nothing scheduled
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-grab rounded-xl border border-cos-border bg-cos-bg p-3"
                    title="Drag to reschedule (coming soon)"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-cos-border group-hover:text-cos-accent" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/events/${item.eventId}`}
                          className="text-sm font-medium text-cos-text hover:text-cos-text"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-cos-muted">{item.eventTitle}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.channel && (
                            <Badge variant="info">
                              {CHANNEL_LABELS[item.channel] ?? item.channel}
                            </Badge>
                          )}
                          <Badge variant="default">{item.status}</Badge>
                          {item.hasDraft && <Badge variant="success">Draft ready</Badge>}
                          {item.isPlaceholder && (
                            <Badge variant="warning">Preview</Badge>
                          )}
                        </div>
                        <div className="mt-3">
                          {mode === "events" ? (
                            <Button size="sm" variant="ghost" disabled>
                              Reschedule
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              Move
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface WeekItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  channel?: string;
  status: string;
  hasDraft?: boolean;
  isPlaceholder?: boolean;
}

function getWeekItems(
  data: CommunicationsCalendarData,
  mode: CalendarMode,
  date: string,
): WeekItem[] {
  switch (mode) {
    case "events":
      return data.events
        .filter((entry) => entry.date === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          eventTitle: entry.title,
          title: entry.title,
          status: entry.status,
        }));
    case "communications":
      return data.communications
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          eventTitle: entry.eventTitle,
          title: entry.stepTitle,
          channel: entry.channel,
          status: entry.status,
          hasDraft: entry.hasDraft,
        }));
    case "publishing":
      return data.publishing
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          eventTitle: entry.eventTitle,
          title: entry.stepTitle ?? "Draft ready",
          channel: entry.channel,
          status: entry.status,
          hasDraft: true,
        }));
    case "approvals":
      return data.approvals
        .filter((entry) => entry.dueDate === date)
        .map((entry) => ({
          id: entry.id,
          eventId: entry.eventId,
          eventTitle: entry.eventTitle,
          title: `${entry.channel} approval`,
          status: entry.status,
          isPlaceholder: true,
        }));
  }
}
