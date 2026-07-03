import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { EventOwnershipStrip } from "@/components/events/EventOwnershipStrip";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { getEventCardDescription } from "@/lib/events/event-card-display";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";
import { canDemoteToCalendarOnly } from "@/lib/events/communication-strategy";
import { RemoveFromCampaignButton } from "@/components/events/RemoveFromCampaignButton";

interface EventCardProps {
  event: Event;
  artwork?: HeroArtworkSelection | null;
  ownership?: EventRosterOwnership | null;
  showRemoveFromCampaigns?: boolean;
  metaPublicationScheduled?: boolean;
}

export function EventCard({
  event,
  artwork = null,
  ownership = null,
  showRemoveFromCampaigns = false,
  metaPublicationScheduled = false,
}: EventCardProps) {
  const formattedTime = formatEventTime(event.time);
  const showThumbnail = hasDisplayableArtwork(artwork);
  const cardDescription = getEventCardDescription(event.description);
  const showScheduledBadge =
    event.status !== "scheduled" || metaPublicationScheduled;

  return (
    <Card interactive className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {showThumbnail && (
              <EventArtworkPreview
                artwork={artwork}
                eventTitle={event.title}
                variant="thumbnail"
              />
            )}
            <Link href={`/events/${event.id}`} className="group min-w-0">
              <CardTitle className="transition-colors duration-200 group-hover:text-cos-primary">
                {event.title}
              </CardTitle>
            </Link>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {showScheduledBadge && <EventStatusBadge status={event.status} />}
            <CommunicationStrategyBadge strategy={event.communicationStrategy} />
          </div>
        </div>
        {cardDescription && (
          <CardDescription className="line-clamp-2">{cardDescription}</CardDescription>
        )}
        {ownership && (
          <EventOwnershipStrip ownership={ownership} filledBadgeEmphasis="prominent" />
        )}
      </CardHeader>

      <div className="mt-auto space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-cos-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {formatEventDate(event.date)}
          </span>
          {formattedTime && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {formattedTime}
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.location}
            </span>
          )}
          {event.audience && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" />
              {event.audience}
            </span>
          )}
        </div>

        {event.theme && (
          <p className="text-xs text-cos-muted/80">Theme: {event.theme}</p>
        )}

        <div className="flex flex-col gap-2">
          <Button href={`/events/${event.id}`} variant="secondary" size="sm" className="w-full">
            Open planning hub
            <ArrowRight className="h-4 w-4" />
          </Button>
          {showRemoveFromCampaigns &&
            canDemoteToCalendarOnly(event.communicationStrategy) && (
            <RemoveFromCampaignButton eventId={event.id} eventTitle={event.title} />
          )}
        </div>
      </div>
    </Card>
  );
}
