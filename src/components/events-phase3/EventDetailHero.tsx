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
      className="grid w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(240px,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(250px,300px)]"
      aria-label="Event hero"
    >
      <div className="flex min-h-[240px] min-w-0 w-full">
        <EventDetailHeroArtwork
          artwork={artwork}
          eventTitle={event.title}
          createWithAiHref={createWithAiHref}
          className="h-full min-h-[240px] flex-1"
        />
      </div>

      <div className="flex min-h-[240px] min-w-0 w-full flex-col rounded-xl border border-cos-border bg-cos-card p-5 sm:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <EventDetailHeroCountdown
            eventDate={event.date}
            eventTime={event.time}
          />
          <div className="min-w-0 border-t border-cos-border pt-5">
            <EventDetailHeroSummary event={event} />
          </div>
        </div>
        <EventDetailHeroStatsStrip stats={stats} className="mt-5" />
      </div>

      <div className="flex min-h-[240px] min-w-0 w-full lg:col-span-2 xl:col-span-1">
        <EventDetailHeroOverview
          event={event}
          playbookName={playbookName}
          eventTypeLabel={eventTypeLabel}
          eventLeadName={eventLeadName}
          className="h-full min-h-[240px] flex-1"
        />
      </div>
    </section>
  );
}

export type { EventDetailHeroStats };
