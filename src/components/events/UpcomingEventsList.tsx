import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { CommunicationHealthRing } from "@/components/playbooks/CommunicationHealthRing";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";

interface UpcomingEventsListProps {
  events: Event[];
  healthByEventId?: Map<string, number>;
}

export function UpcomingEventsList({
  events,
  healthByEventId,
}: UpcomingEventsListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing scheduled yet"
        description="Add your next PTO event when you're ready — we'll help you plan the communications."
        action={{ label: "Create your first event", href: "/events/create" }}
      />
    );
  }

  return (
    <ul className="divide-y divide-cos-border">
      {events.map((event) => {
        const formattedTime = formatEventTime(event.time);
        const health = healthByEventId?.get(event.id);
        const showHealth =
          health !== undefined && shouldAssignPlaybook(event.communicationStrategy);

        return (
          <li key={event.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                {showHealth && (
                  <CommunicationHealthRing
                    percent={health}
                    size="sm"
                    showLabel={false}
                    className="shrink-0"
                  />
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-cos-text">{event.title}</p>
                    <EventStatusBadge status={event.status} />
                    <CommunicationStrategyBadge strategy={event.communicationStrategy} />
                  </div>
                  <p className="text-sm text-cos-muted line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cos-dark-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatEventDate(event.date)}
                    </span>
                    {formattedTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formattedTime}
                      </span>
                    )}
                    {event.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/events/${event.id}`}
                className="shrink-0 text-sm font-medium text-cos-accent hover:text-cos-muted"
              >
                Open workspace
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
