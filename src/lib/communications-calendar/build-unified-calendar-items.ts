import { mapEventRows } from "@/lib/events/mappers";
import { isoToLocalDateOnly, normalizeDateOnly } from "@/lib/utils/dates";
import type { MetaPublicationSlot } from "@/lib/meta-publishing/types";
import type { UnifiedCalendarRawData } from "@/lib/communications-calendar/unified-calendar-raw";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

function toDateOnly(value: string): string {
  if (value.includes("T")) {
    return isoToLocalDateOnly(value);
  }

  return normalizeDateOnly(value);
}

function aggregateMetaStatus(
  slots: MetaPublicationSlot[],
): "published" | "scheduled" | "draft" {
  if (slots.some((slot) => slot.status === "published")) {
    return "published";
  }

  if (
    slots.some((slot) =>
      ["scheduled", "approved", "posting", "failed"].includes(slot.status),
    )
  ) {
    return "scheduled";
  }

  return "draft";
}

function buildMetaMilestoneItems(
  slots: MetaPublicationSlot[],
  eventTitleById: Map<string, string>,
): PlanningCalendarItem[] {
  const groups = new Map<string, MetaPublicationSlot[]>();

  for (const slot of slots) {
    if (!slot.scheduledFor) {
      continue;
    }

    const scheduledDate = toDateOnly(slot.scheduledFor);
    const key = `${slot.eventId}:${slot.relativeDay}:${scheduledDate}`;
    const list = groups.get(key) ?? [];
    list.push(slot);
    groups.set(key, list);
  }

  const items: PlanningCalendarItem[] = [];

  for (const [, group] of groups) {
    const first = group[0]!;
    const scheduledDate = toDateOnly(first.scheduledFor!);
    const aggregateStatus = aggregateMetaStatus(group);

    items.push({
      id: `meta-${first.eventId}-${first.relativeDay}-${scheduledDate}`,
      sourceId: `${first.eventId}-${first.relativeDay}`,
      sourceType: "meta_milestone",
      eventId: first.eventId,
      eventTitle: eventTitleById.get(first.eventId) ?? "Event",
      title: `${first.milestoneTitle} — Meta`,
      timelineStepTitle: first.milestoneTitle,
      timelineStepId: null,
      communicationItemId: null,
      channel: null,
      communicationType: "meta_milestone",
      scheduledDate,
      status: aggregateStatus,
      assignedUser: null,
      draftContent: null,
      draftStatus: null,
      artworkStatus: null,
      approvalStatus: null,
      publishStatus: aggregateStatus === "published" ? "published" : "scheduled",
      versionNumber: null,
    });
  }

  return items;
}

/** Parent calendar: school events + one chip per Meta milestone (FB+IG combined). */
export function buildUnifiedCalendarItemsFromRaw(
  raw: UnifiedCalendarRawData,
): PlanningCalendarItem[] {
  const events = mapEventRows(raw.eventRows);
  const eventTitleById = new Map(events.map((event) => [event.id, event.title]));

  const eventItems: PlanningCalendarItem[] = events.map((event) => ({
    id: `event-${event.id}`,
    sourceId: event.id,
    sourceType: "event",
    eventId: event.id,
    eventTitle: event.title,
    title: event.title,
    timelineStepTitle: null,
    timelineStepId: null,
    communicationItemId: null,
    channel: null,
    communicationType: "event",
    scheduledDate: event.date,
    status: event.status,
    assignedUser: event.eventOwner,
    draftContent: null,
    draftStatus: null,
    artworkStatus: null,
    approvalStatus: null,
    publishStatus: null,
    versionNumber: null,
    communicationStrategy: event.communicationStrategy,
  }));

  const metaItems = buildMetaMilestoneItems(raw.metaSlots, eventTitleById);

  return [...eventItems, ...metaItems].sort((left, right) =>
    left.scheduledDate.localeCompare(right.scheduledDate),
  );
}
