import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EditEventDetailsButton } from "@/components/event-workspace/EditEventDetailsButton";
import { cn } from "@/lib/utils/cn";
import type { Event } from "@/types";

interface EventDetailHeroOverviewProps {
  event: Event;
  playbookName: string | null;
  eventTypeLabel: string | null;
  eventLeadName: string;
  className?: string;
}

export function EventDetailHeroOverview({
  event,
  playbookName,
  eventTypeLabel,
  eventLeadName,
  className,
}: EventDetailHeroOverviewProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-col rounded-xl border border-cos-border bg-cos-card p-4 sm:p-5",
        className,
      )}
    >
      <h2 className="font-display text-base text-cos-text">Event Overview</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <OverviewRow label="Status">
          <EventStatusBadge status={event.status} />
        </OverviewRow>
        {eventTypeLabel ? (
          <OverviewRow label="Event type">
            <span className="text-right text-cos-text">{eventTypeLabel}</span>
          </OverviewRow>
        ) : null}
        {playbookName ? (
          <OverviewRow label="Playbook">
            <span className="text-right text-cos-text">{playbookName}</span>
          </OverviewRow>
        ) : null}
        <OverviewRow label="Event Lead">
          <span className="text-right text-cos-text">{eventLeadName}</span>
        </OverviewRow>
        <OverviewRow label="Created on">
          <span className="text-cos-text">
            {new Date(event.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </OverviewRow>
        {event.updatedAt ? (
          <OverviewRow label="Last updated">
            <span className="text-cos-text">
              {new Date(event.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </OverviewRow>
        ) : null}
      </dl>
      <div className="mt-4 pt-1">
        <EditEventDetailsButton event={event} size="sm" />
      </div>
    </div>
  );
}

function OverviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-cos-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
