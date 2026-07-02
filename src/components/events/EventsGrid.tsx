import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

interface EventsGridProps {
  events: Event[];
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
}

export function EventsGrid({
  events,
  artworkByEventId,
  ownershipByEventId,
}: EventsGridProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled yet"
        description="When you add a campaign, we'll help you stay organized."
        action={{ label: "Create campaign", href: "/events/create" }}
        className="rounded-xl border border-dashed border-cos-border bg-cos-card py-16"
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          artwork={artworkByEventId.get(event.id) ?? null}
          ownership={ownershipByEventId?.get(event.id) ?? null}
        />
      ))}
    </div>
  );
}
