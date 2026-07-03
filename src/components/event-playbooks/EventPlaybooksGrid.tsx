import { EventPlaybookCard } from "@/components/event-playbooks/EventPlaybookCard";
import { Card } from "@/components/ui/Card";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";

interface EventPlaybooksGridProps {
  events: Event[];
  progressByEventId: Map<string, number>;
  taskStatsByEventId: Map<string, { total: number; done: number }>;
  ownershipByEventId: Map<string, EventRosterOwnership>;
}

export function EventPlaybooksGrid({
  events,
  progressByEventId,
  taskStatsByEventId,
  ownershipByEventId,
}: EventPlaybooksGridProps) {
  if (events.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="font-display text-xl text-cos-text">No events to plan yet</p>
        <p className="mt-2 text-sm text-cos-muted">
          Events with a communication plan (not calendar-only) for the active school year
          will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const stats = taskStatsByEventId.get(event.id) ?? { total: 0, done: 0 };
        return (
          <EventPlaybookCard
            key={event.id}
            event={event}
            planningProgressPercent={progressByEventId.get(event.id) ?? 0}
            taskCount={stats.total}
            doneTaskCount={stats.done}
            ownership={ownershipByEventId.get(event.id) ?? null}
          />
        );
      })}
    </div>
  );
}
