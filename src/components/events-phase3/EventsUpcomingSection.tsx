"use client";

import Link from "next/link";
import { CalendarDays, User } from "lucide-react";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/Button";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate } from "@/lib/utils/dates";
import type { Event } from "@/types";

type ResponsiblePerson = {
  displayName: string;
  organizationTitle: string | null;
};

interface EventsUpcomingSectionProps {
  events: Event[];
  artworkByEventId: Record<string, HeroArtworkSelection | null>;
  responsibleByEventId: Record<string, ResponsiblePerson>;
}

export function EventsUpcomingSection({
  events,
  artworkByEventId,
  responsibleByEventId,
}: EventsUpcomingSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-cos-text">Upcoming Events</h2>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cos-muted transition-colors hover:text-cos-text"
        >
          <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
          View calendar
        </Link>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {events.map((event) => {
          const artwork = artworkByEventId[event.id] ?? null;
          const responsible = responsibleByEventId[event.id] ?? {
            displayName: "Not assigned",
            organizationTitle: null,
          };
          const typeLabel = event.eventType
            ? (EVENT_TYPE_LABELS[event.eventType] ?? event.eventType)
            : event.category;

          return (
            <article
              key={event.id}
              className="flex min-w-[14.5rem] max-w-[14.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-cos-border bg-cos-card"
            >
              <EventsHomeArtwork
                artwork={artwork}
                eventTitle={event.title}
                size="upcoming"
              />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 p-2.5">
                <Link
                  href={`/events/${event.id}`}
                  className="line-clamp-2 min-h-[2.25rem] text-sm font-semibold text-cos-text hover:text-cos-primary"
                >
                  {event.title}
                </Link>
                <p className="inline-flex items-center gap-1 text-xs text-cos-muted">
                  <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {formatEventDate(event.date)}
                </p>
                <div className="min-h-[1.25rem]">
                  {typeLabel ? (
                    <span className="inline-flex rounded-full bg-cos-bg px-2 py-0.5 text-[10px] font-medium text-cos-muted">
                      {typeLabel}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <EventStatusBadge status={event.status} />
                  <span className="inline-flex min-w-0 items-center gap-1 text-xs text-cos-muted">
                    <User className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{responsible.displayName}</span>
                  </span>
                </div>
                <Button
                  href={`/events/${event.id}`}
                  variant="secondary"
                  size="sm"
                  className="mt-auto w-full"
                >
                  View Details
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function EventsHomeArtwork({
  artwork,
  eventTitle,
  size = "row",
}: {
  artwork: HeroArtworkSelection | null;
  eventTitle: string;
  size?: "row" | "upcoming";
}) {
  const isUpcoming = size === "upcoming";
  const frameClassName = isUpcoming
    ? "relative aspect-[5/4] w-full overflow-hidden bg-[#f7f6f3]"
    : "relative h-[7.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-xl bg-[#f7f6f3] ring-1 ring-cos-border/60";

  if (hasDisplayableArtwork(artwork) && artwork.imageUrl) {
    return (
      <div className={frameClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imageUrl}
          alt={isUpcoming ? "" : `${eventTitle} artwork`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={
        isUpcoming
          ? "flex aspect-[5/4] w-full items-center justify-center bg-gradient-to-br from-[#e8efe9] via-[#f5f1ea] to-[#ebe6df]"
          : "flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8efe9] via-[#f5f1ea] to-[#ebe6df] ring-1 ring-cos-border/60"
      }
      aria-hidden
    >
      <CalendarDays
        className={isUpcoming ? "h-7 w-7 text-cos-muted" : "h-8 w-8 text-cos-muted"}
        strokeWidth={1.5}
      />
    </div>
  );
}
