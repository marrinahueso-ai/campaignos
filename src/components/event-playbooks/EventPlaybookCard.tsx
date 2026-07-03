import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { PlanningProgressRing } from "@/components/event-playbooks/PlanningProgressRing";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatEventDate } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";

interface EventPlaybookCardProps {
  event: Event;
  planningProgressPercent: number;
  taskCount: number;
  doneTaskCount: number;
  ownership: EventRosterOwnership | null;
}

export function EventPlaybookCard({
  event,
  planningProgressPercent,
  taskCount,
  doneTaskCount,
  ownership,
}: EventPlaybookCardProps) {
  const chairLabel =
    ownership?.chairNames.length ? ownership.chairNames.join(", ") : "Unassigned";

  return (
    <Card interactive className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <Link href={`/events/${event.id}`} className="group min-w-0">
            <CardTitle className="transition-colors duration-200 group-hover:text-cos-primary">
              {event.title}
            </CardTitle>
          </Link>
          <CommunicationStrategyBadge strategy={event.communicationStrategy} />
        </div>
        {event.description && (
          <CardDescription className="line-clamp-2">{event.description}</CardDescription>
        )}
      </CardHeader>

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center gap-6">
          <PlanningProgressRing percent={planningProgressPercent} size={88} strokeWidth={6} />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="text-cos-text">
              {doneTaskCount} of {taskCount} tasks done
            </p>
            <p className="text-cos-muted">Chair: {chairLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-cos-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {formatEventDate(event.date)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.location}
            </span>
          )}
        </div>

        <Button
          href={`/events/${event.id}`}
          variant="secondary"
          size="sm"
          className="mt-auto w-full"
        >
          Open planning hub
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
