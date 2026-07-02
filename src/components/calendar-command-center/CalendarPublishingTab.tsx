"use client";

import Link from "next/link";
import { Radio, Send } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getChannelStyles, ITEM_TYPE_LABELS } from "@/lib/communications-calendar/channel-styles";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { cn } from "@/lib/utils/cn";
import { getTodayDateString } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface CalendarPublishingTabProps {
  items: PlanningCalendarItem[];
}

export function CalendarPublishingTab({ items }: CalendarPublishingTabProps) {
  const today = getTodayDateString();
  const publishingItems = items
    .filter(
      (item) =>
        item.communicationType === "scheduled_post" ||
        (item.communicationType === "draft" &&
          item.publishStatus !== "published" &&
          item.draftContent),
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  if (publishingItems.length === 0) {
    return (
      <div className="rounded-2xl border border-cos-border bg-white shadow-sm">
        <EmptyState
          icon={Send}
          title="Nothing scheduled yet"
          description="When posts are scheduled or drafts are ready to publish, they will appear here. Generate drafts from an event workspace to get started."
          action={{ label: "View events", href: "/events" }}
          className="py-16"
        />
      </div>
    );
  }

  const upcoming = publishingItems.filter((item) => item.scheduledDate >= today);
  const past = publishingItems.filter((item) => item.scheduledDate < today);

  return (
    <div className="space-y-6">
      <PublishingSection title="Scheduled & ready" items={upcoming} emptyLabel="No upcoming publish dates." />
      {past.length > 0 && (
        <PublishingSection title="Past schedule" items={past} muted />
      )}
    </div>
  );
}

function PublishingSection({
  title,
  items,
  emptyLabel,
  muted = false,
}: {
  title: string;
  items: PlanningCalendarItem[];
  emptyLabel?: string;
  muted?: boolean;
}) {
  if (items.length === 0 && emptyLabel) {
    return (
      <section className="rounded-2xl border border-dashed border-cos-border bg-white px-6 py-10 text-center">
        <p className="text-sm text-cos-muted">{emptyLabel}</p>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm",
        muted && "opacity-80",
      )}
    >
      <header className="border-b border-cos-border px-5 py-3">
        <h3 className="text-sm font-semibold text-cos-text">{title}</h3>
      </header>
      <div className="divide-y divide-cos-border">
        {items.map((item) => {
          const styles = getChannelStyles(item.channel);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-cos-text">{item.title}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      styles.bg,
                      styles.border,
                      styles.text,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
                    {item.channel ? CHANNEL_LABELS[item.channel] : "General"}
                  </span>
                  <span className="rounded-full bg-cos-bg-alt px-2 py-0.5 text-[10px] font-medium text-cos-muted">
                    {ITEM_TYPE_LABELS[item.communicationType]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-cos-muted">{item.eventTitle}</p>
                {item.draftContent && (
                  <p className="mt-2 line-clamp-2 text-sm text-cos-muted">
                    {item.draftContent}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <p className="text-sm font-semibold text-cos-text">
                  {formatPublishDate(item.scheduledDate)}
                </p>
                <p className="text-xs capitalize text-cos-muted">
                  {item.publishStatus ?? item.status}
                </p>
                <Link
                  href={`/events/${item.eventId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cos-accent hover:text-cos-muted"
                >
                  <Radio className="h-3.5 w-3.5" />
                  Open workspace
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatPublishDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
