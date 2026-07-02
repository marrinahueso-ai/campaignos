import type { Event } from "@/types";

export function isArchivedEvent(event: Pick<Event, "status">): boolean {
  return event.status === "archived";
}

export function partitionEventsByArchiveStatus(events: Event[]): {
  activeEvents: Event[];
  archivedEvents: Event[];
} {
  const activeEvents: Event[] = [];
  const archivedEvents: Event[] = [];

  for (const event of events) {
    if (isArchivedEvent(event)) {
      archivedEvents.push(event);
    } else {
      activeEvents.push(event);
    }
  }

  return { activeEvents, archivedEvents };
}
