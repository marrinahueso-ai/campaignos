import { EventDetailHeroArtwork } from "@/components/events-phase3/EventDetailHeroArtwork";
import { EventDetailHeroCountdown } from "@/components/events-phase3/EventDetailHeroCountdown";
import {
  EventDetailHeroStatsStrip,
  type EventDetailHeroStats,
} from "@/components/events-phase3/EventDetailHeroStatsStrip";
import { EventDetailHeroSummary } from "@/components/events-phase3/EventDetailHeroSummary";
import { EventDetailHeroOverview } from "@/components/events-phase3/EventDetailHeroOverview";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

interface EventDetailHeroProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  playbookName: string | null;
  eventTypeLabel: string | null;
  eventLeadName: string;
  createWithAiHref: string;
  stats: EventDetailHeroStats;
}

export function EventDetailHero({
  event,
  artwork,
  playbookName,
  eventTypeLabel,
  eventLeadName,
  createWithAiHref,
  stats,
}: EventDetailHeroProps) {
  return (
    <section
      className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(160px,200px)_minmax(0,1fr)] xl:grid-cols-[minmax(160px,200px)_minmax(0,1fr)_minmax(220px,260px)]"
      aria-label="Event hero"
    >
      <div className="min-w-0 w-full">
        <EventDetailHeroArtwork
          artwork={artwork}
          eventTitle={event.title}
          createWithAiHref={createWithAiHref}
        />
      </div>

      <div className="flex min-w-0 w-full flex-col rounded-xl border border-cos-border bg-cos-card p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3">
          <EventDetailHeroCountdown
            eventDate={event.date}
            eventTime={event.time}
          />
          <div className="min-w-0 border-t border-cos-border pt-3">
            <EventDetailHeroSummary event={event} />
          </div>
        </div>
        <EventDetailHeroStatsStrip
          eventId={event.id}
          stats={stats}
          className="mt-4"
        />

      </div>

      <div className="min-w-0 w-full lg:col-span-2 xl:col-span-1">
        <EventDetailHeroOverview
          event={event}
          playbookName={playbookName}
          eventTypeLabel={eventTypeLabel}
          eventLeadName={eventLeadName}
        />
      </div>
    </section>
  );
}

export type { EventDetailHeroStats };
