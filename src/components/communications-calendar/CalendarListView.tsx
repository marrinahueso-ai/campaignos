"use client";

import { ArrowUpRight, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  buildListItems,
  groupListItemsByDate,
} from "@/lib/communications-calendar/list-items";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate } from "@/lib/utils/dates";
import type {
  CalendarListItem,
  CalendarMode,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";

interface CalendarListViewProps {
  data: CommunicationsCalendarData;
  mode: CalendarMode;
}

const TYPE_LABELS: Record<CalendarListItem["type"], string> = {
  event: "Event",
  communication: "Communication",
  publishing: "Publishing",
  approval: "Approval",
};

export function CalendarListView({ data, mode }: CalendarListViewProps) {
  const grouped = groupListItemsByDate(buildListItems(data, mode));

  if (grouped.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cos-border bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-base font-medium text-cos-text">Nothing on the calendar yet</p>
        <p className="mt-2 text-sm text-cos-muted">
          Create events and assign playbooks to populate your communications plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([date, items]) => (
        <section
          key={date}
          className="overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm"
        >
          <div className="border-b border-cos-border bg-cos-bg px-5 py-4">
            <h2 className="text-sm font-semibold text-cos-text">{formatEventDate(date)}</h2>
          </div>

          <ul className="divide-y divide-cos-border">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <GripVertical
                      className="mt-1 h-4 w-4 shrink-0 cursor-grab text-cos-border"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{TYPE_LABELS[item.type]}</Badge>
                        {item.channel && (
                          <Badge variant="default">
                            {CHANNEL_LABELS[item.channel] ?? item.channel}
                          </Badge>
                        )}
                        <Badge variant="default">{item.status}</Badge>
                        {item.hasDraft && <Badge variant="success">Draft</Badge>}
                        {item.isPlaceholder && <Badge variant="warning">Preview</Badge>}
                      </div>
                      <p className="mt-2 text-base font-semibold text-cos-text">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-cos-muted">{item.eventName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.type === "event" ? (
                      <Button size="sm" variant="ghost" disabled>
                        Reschedule
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>
                        Move
                      </Button>
                    )}
                    <Button href={`/events/${item.eventId}`} size="sm" variant="secondary">
                      Open Workspace
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
