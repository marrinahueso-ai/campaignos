"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { EventOwnershipStrip } from "@/components/events/EventOwnershipStrip";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { Badge } from "@/components/ui/Badge";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { getEventCardDescription } from "@/lib/events/event-card-display";
import { EVENT_TYPE_LABELS, DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";

interface CampaignsListViewProps {
  events: Event[];
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
}

export function CampaignsListView({
  events,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
}: CampaignsListViewProps) {
  return (
    <div className="divide-y divide-cos-border">
      {events.map((event) => {
        const artwork = artworkByEventId.get(event.id) ?? null;
        const ownership = ownershipByEventId?.get(event.id) ?? null;
        const showThumbnail = hasDisplayableArtwork(artwork);
        const cardDescription = getEventCardDescription(event.description);
        const formattedTime = formatEventTime(event.time);
        const metaScheduled = metaScheduledEventIds?.has(event.id) ?? false;
        const eventType = (event.eventType ?? DEFAULT_EVENT_TYPE) as EventType;
        const typeLabel = EVENT_TYPE_LABELS[eventType];

        return (
          <article
            key={event.id}
            className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-cos-bg/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {showThumbnail && (
                <EventArtworkPreview
                  artwork={artwork}
                  eventTitle={event.title}
                  variant="thumbnail"
                />
              )}
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-medium text-cos-text transition-colors hover:text-cos-primary"
                  >
                    {event.title}
                  </Link>
                  {event.status !== "scheduled" || metaScheduled ? (
                    <EventStatusBadge status={event.status} />
                  ) : null}
                  {metaScheduled ? (
                    <Badge variant="success">Queued</Badge>
                  ) : (
                    <CommunicationStrategyBadge strategy={event.communicationStrategy} />
                  )}
                </div>
                {cardDescription && (
                  <p className="line-clamp-2 text-sm text-cos-muted">{cardDescription}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cos-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {formatEventDate(event.date)}
                  </span>
                  {formattedTime && <span>{formattedTime}</span>}
                  <span>{typeLabel}</span>
                </div>
                {ownership && (
                  <EventOwnershipStrip ownership={ownership} />
                )}
              </div>
            </div>

            <Link
              href={`/events/${event.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-cos-muted transition-colors hover:text-cos-text sm:self-center"
            >
              Open
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
