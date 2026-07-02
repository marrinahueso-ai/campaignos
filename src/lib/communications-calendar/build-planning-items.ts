import {
  ASSET_CHANNEL_MAP,
  ASSET_TYPE_LABELS,
} from "@/lib/communications-calendar/channel-styles";
import {
  buildLatestContentByItemId,
  type PlanningRawData,
} from "@/lib/communications-calendar/planning-raw";
import { mapEventRows } from "@/lib/events/mappers";
import { mapEventCommunicationStepRow } from "@/lib/playbooks/mappers";
import { getTodayDateString, isoToLocalDateOnly, normalizeDateOnly } from "@/lib/utils/dates";
import type {
  ApprovalRequestRow,
  CommunicationItemRow,
  EventAssetRow,
  PublicationScheduleRow,
} from "@/types/event-workspace";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export interface BuildPlanningItemsOptions {
  /** Artwork rows are only needed for calendar views and good-news edge cases. */
  includeArtwork: boolean;
  /** Standalone drafts without a playbook step. */
  includeOrphanDrafts: boolean;
}

export const FULL_PLANNING_ITEM_OPTIONS: BuildPlanningItemsOptions = {
  includeArtwork: true,
  includeOrphanDrafts: true,
};

/** Today skips no tables; artwork assembly kept for good-news parity. */
export const TODAY_PLANNING_ITEM_OPTIONS: BuildPlanningItemsOptions = {
  includeArtwork: true,
  includeOrphanDrafts: true,
};

function toDateOnly(value: string): string {
  if (value.includes("T")) {
    return isoToLocalDateOnly(value);
  }

  return normalizeDateOnly(value);
}

export function buildPlanningItemsFromRaw(
  raw: PlanningRawData,
  options: BuildPlanningItemsOptions,
): PlanningCalendarItem[] {
  const today = getTodayDateString();
  const items: PlanningCalendarItem[] = [];

  const events = mapEventRows(raw.eventRows).filter(
    (event) => event.status !== "archived",
  );
  const eventTitleById = new Map(events.map((event) => [event.id, event.title]));
  const eventDateById = new Map(events.map((event) => [event.id, event.date]));
  const activeEventIds = new Set(events.map((event) => event.id));

  const steps = raw.stepRows.map((row) => mapEventCommunicationStepRow(row));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const contentByItemId = buildLatestContentByItemId(raw.versionRows);

  const commItems = raw.itemRows;
  const draftByStepId = new Map<string, CommunicationItemRow>();
  for (const item of commItems) {
    if (item.event_communication_step_id) {
      draftByStepId.set(item.event_communication_step_id, item);
    }
  }

  for (const event of events) {
    items.push({
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
    });
  }

  for (const step of steps) {
    if (!activeEventIds.has(step.eventId)) continue;
    const draft = draftByStepId.get(step.id);
    const draftMeta = draft ? contentByItemId.get(draft.id) : undefined;

    items.push({
      id: `step-${step.id}`,
      sourceId: step.id,
      sourceType: "timeline_task",
      eventId: step.eventId,
      eventTitle: eventTitleById.get(step.eventId) ?? "Event",
      title: step.title,
      timelineStepTitle: step.title,
      timelineStepId: step.id,
      communicationItemId: draft?.id ?? null,
      channel: step.channel,
      communicationType: "timeline_task",
      scheduledDate: step.dueDate,
      status: step.status,
      assignedUser: null,
      draftContent: draftMeta?.content ?? null,
      draftStatus: draft?.status ?? null,
      artworkStatus: null,
      approvalStatus: null,
      publishStatus: draft?.is_published ? "published" : draft ? "draft" : null,
      versionNumber: draftMeta?.version ?? null,
    });

    if (draft && !items.some((entry) => entry.id === `draft-${draft.id}`)) {
      items.push({
        id: `draft-${draft.id}`,
        sourceId: draft.id,
        sourceType: "draft",
        eventId: draft.event_id,
        eventTitle: eventTitleById.get(draft.event_id) ?? "Event",
        title: `${step.title} Draft`,
        timelineStepTitle: step.title,
        timelineStepId: step.id,
        communicationItemId: draft.id,
        channel: draft.channel,
        communicationType: "draft",
        scheduledDate: step.dueDate,
        status: draft.status,
        assignedUser: null,
        draftContent: draftMeta?.content ?? null,
        draftStatus: draft.status,
        artworkStatus: null,
        approvalStatus: null,
        publishStatus: draft.is_published ? "published" : "draft",
        versionNumber: draftMeta?.version ?? null,
      });
    }
  }

  if (options.includeOrphanDrafts) {
    for (const item of commItems) {
      if (!activeEventIds.has(item.event_id)) continue;
      if (item.event_communication_step_id) continue;
      const draftMeta = contentByItemId.get(item.id);
      const eventDate = eventDateById.get(item.event_id) ?? today;

      items.push({
        id: `draft-${item.id}`,
        sourceId: item.id,
        sourceType: "draft",
        eventId: item.event_id,
        eventTitle: eventTitleById.get(item.event_id) ?? "Event",
        title: `${item.channel} Draft`,
        timelineStepTitle: null,
        timelineStepId: null,
        communicationItemId: item.id,
        channel: item.channel,
        communicationType: "draft",
        scheduledDate: eventDate,
        status: item.status,
        assignedUser: null,
        draftContent: draftMeta?.content ?? null,
        draftStatus: item.status,
        artworkStatus: null,
        approvalStatus: null,
        publishStatus: item.is_published ? "published" : "draft",
        versionNumber: draftMeta?.version ?? null,
      });
    }
  }

  if (options.includeArtwork) {
    for (const row of raw.assetRows as EventAssetRow[]) {
      if (!activeEventIds.has(row.event_id)) continue;
      const channel = ASSET_CHANNEL_MAP[row.asset_type] ?? null;
      const linkedStep = channel
        ? steps.find((step) => step.eventId === row.event_id && step.channel === channel)
        : undefined;

      items.push({
        id: `artwork-${row.id}`,
        sourceId: row.id,
        sourceType: "artwork",
        eventId: row.event_id,
        eventTitle: eventTitleById.get(row.event_id) ?? "Event",
        title: ASSET_TYPE_LABELS[row.asset_type],
        timelineStepTitle: linkedStep?.title ?? null,
        timelineStepId: linkedStep?.id ?? null,
        communicationItemId: null,
        channel,
        communicationType: "artwork",
        scheduledDate: linkedStep?.dueDate ?? eventDateById.get(row.event_id) ?? today,
        status: row.status,
        assignedUser: null,
        draftContent: null,
        draftStatus: null,
        artworkStatus: row.status,
        approvalStatus: null,
        publishStatus: null,
        versionNumber: null,
      });
    }
  }

  for (const row of raw.approvalRows as ApprovalRequestRow[]) {
    if (!activeEventIds.has(row.event_id)) continue;
    const linkedItem = commItems.find((item) => item.id === row.communication_item_id);
    const linkedStep = linkedItem?.event_communication_step_id
      ? stepById.get(linkedItem.event_communication_step_id)
      : undefined;

    items.push({
      id: `approval-${row.id}`,
      sourceId: row.id,
      sourceType: "approval",
      eventId: row.event_id,
      eventTitle: eventTitleById.get(row.event_id) ?? "Event",
      title: "Board Approval",
      timelineStepTitle: linkedStep?.title ?? null,
      timelineStepId: linkedStep?.id ?? null,
      communicationItemId: row.communication_item_id,
      channel: linkedItem?.channel ?? null,
      communicationType: "approval",
      scheduledDate: toDateOnly(row.requested_at),
      status: row.status,
      assignedUser: null,
      draftContent: linkedItem
        ? contentByItemId.get(linkedItem.id)?.content ?? null
        : null,
      draftStatus: linkedItem?.status ?? null,
      artworkStatus: null,
      approvalStatus: row.status,
      publishStatus: null,
      versionNumber: linkedItem
        ? contentByItemId.get(linkedItem.id)?.version ?? null
        : null,
    });
  }

  for (const row of raw.scheduleRows as PublicationScheduleRow[]) {
    if (!activeEventIds.has(row.event_id)) continue;
    const linkedItem = commItems.find((item) => item.id === row.communication_item_id);
    const linkedStep = linkedItem?.event_communication_step_id
      ? stepById.get(linkedItem.event_communication_step_id)
      : undefined;

    items.push({
      id: `schedule-${row.id}`,
      sourceId: row.id,
      sourceType: "scheduled_post",
      eventId: row.event_id,
      eventTitle: eventTitleById.get(row.event_id) ?? "Event",
      title: linkedStep?.title ?? "Scheduled Post",
      timelineStepTitle: linkedStep?.title ?? null,
      timelineStepId: linkedStep?.id ?? null,
      communicationItemId: row.communication_item_id,
      channel: linkedItem?.channel ?? null,
      communicationType: "scheduled_post",
      scheduledDate: toDateOnly(row.scheduled_for),
      status: row.status,
      assignedUser: null,
      draftContent: linkedItem
        ? contentByItemId.get(linkedItem.id)?.content ?? null
        : null,
      draftStatus: linkedItem?.status ?? null,
      artworkStatus: null,
      approvalStatus: null,
      publishStatus: row.status,
      versionNumber: linkedItem
        ? contentByItemId.get(linkedItem.id)?.version ?? null
        : null,
    });
  }

  return dedupeItems(items);
}

function dedupeItems(items: PlanningCalendarItem[]): PlanningCalendarItem[] {
  const seen = new Set<string>();
  const result: PlanningCalendarItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

export function buildStepsByEventIdFromRaw(
  raw: PlanningRawData,
  eventIds: string[],
): Map<string, ReturnType<typeof mapEventCommunicationStepRow>[]> {
  const allowed = new Set(eventIds);
  const map = new Map<string, ReturnType<typeof mapEventCommunicationStepRow>[]>();

  for (const row of raw.stepRows) {
    if (!allowed.has(row.event_id)) continue;
    const step = mapEventCommunicationStepRow(row);
    const list = map.get(step.eventId) ?? [];
    list.push(step);
    map.set(step.eventId, list);
  }

  return map;
}
