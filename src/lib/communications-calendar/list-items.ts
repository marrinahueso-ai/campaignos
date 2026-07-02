import type {
  CalendarApprovalEntry,
  CalendarCommunicationEntry,
  CalendarEventEntry,
  CalendarListItem,
  CalendarMode,
  CalendarPublishingEntry,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";

export function buildListItems(
  data: CommunicationsCalendarData,
  mode: CalendarMode,
): CalendarListItem[] {
  switch (mode) {
    case "events":
      return data.events.map((event) => toEventListItem(event));
    case "communications":
      return data.communications.map((entry) => toCommunicationListItem(entry));
    case "publishing":
      return data.publishing.map((entry) => toPublishingListItem(entry));
    case "approvals":
      return data.approvals.map((entry) => toApprovalListItem(entry));
  }
}

function toEventListItem(event: CalendarEventEntry): CalendarListItem {
  return {
    id: event.id,
    type: "event",
    eventId: event.eventId,
    eventName: event.title,
    channel: null,
    status: event.status,
    dueDate: event.date,
    title: event.title,
  };
}

function toCommunicationListItem(
  entry: CalendarCommunicationEntry,
): CalendarListItem {
  return {
    id: entry.id,
    type: "communication",
    eventId: entry.eventId,
    eventName: entry.eventTitle,
    channel: entry.channel,
    status: entry.status,
    dueDate: entry.dueDate,
    title: entry.stepTitle,
    hasDraft: entry.hasDraft,
  };
}

function toPublishingListItem(entry: CalendarPublishingEntry): CalendarListItem {
  return {
    id: entry.id,
    type: "publishing",
    eventId: entry.eventId,
    eventName: entry.eventTitle,
    channel: entry.channel,
    status: entry.status,
    dueDate: entry.dueDate,
    title: entry.stepTitle ?? "Draft ready",
    hasDraft: true,
  };
}

function toApprovalListItem(entry: CalendarApprovalEntry): CalendarListItem {
  return {
    id: entry.id,
    type: "approval",
    eventId: entry.eventId,
    eventName: entry.eventTitle,
    channel: entry.channel,
    status: entry.status,
    dueDate: entry.dueDate,
    title: `${entry.channel} approval`,
    isPlaceholder: true,
  };
}

export function groupListItemsByDate(
  items: CalendarListItem[],
): Map<string, CalendarListItem[]> {
  const grouped = new Map<string, CalendarListItem[]>();

  for (const item of [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const bucket = grouped.get(item.dueDate) ?? [];
    bucket.push(item);
    grouped.set(item.dueDate, bucket);
  }

  return grouped;
}
