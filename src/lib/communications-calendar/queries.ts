import { createClient } from "@/lib/supabase/server";
import { PLACEHOLDER_APPROVALS } from "@/lib/communications-calendar/constants";
import {
  PLANNING_EVENT_SELECT,
  PLANNING_ITEM_SELECT,
  PLANNING_STEP_SELECT,
} from "@/lib/communications-calendar/planning-selects";
import { getWorkloadLevel } from "@/lib/communications-calendar/workload";
import { mapEventRows } from "@/lib/events/mappers";
import { mapEventCommunicationStepRow } from "@/lib/playbooks/mappers";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { CommunicationChannel } from "@/types/event-workspace";
import type {
  CalendarApprovalEntry,
  CalendarCommunicationEntry,
  CalendarDaySummary,
  CalendarEventEntry,
  CalendarPublishingEntry,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";
import type { EventCommunicationStepRow } from "@/types/playbooks";
import type { EventRow as CoreEventRow } from "@/types";
import type { CommunicationItemRow } from "@/types/event-workspace";

function buildDaySummaries(
  events: CalendarEventEntry[],
  communications: CalendarCommunicationEntry[],
  publishing: CalendarPublishingEntry[],
): CalendarDaySummary[] {
  const byDate = new Map<string, CalendarDaySummary>();

  function ensure(date: string): CalendarDaySummary {
    const existing = byDate.get(date);
    if (existing) return existing;
    const summary: CalendarDaySummary = {
      date,
      eventCount: 0,
      communicationCount: 0,
      draftCount: 0,
      workload: "calm",
      workloadTotal: 0,
    };
    byDate.set(date, summary);
    return summary;
  }

  for (const event of events) {
    const day = ensure(event.date);
    day.eventCount += 1;
  }

  for (const step of communications) {
    const day = ensure(step.dueDate);
    day.communicationCount += 1;
    if (step.hasDraft) day.draftCount += 1;
  }

  for (const draft of publishing) {
    const day = ensure(draft.dueDate);
    day.draftCount += 1;
  }

  for (const summary of byDate.values()) {
    summary.workloadTotal =
      summary.communicationCount + summary.draftCount + summary.eventCount;
    summary.workload = getWorkloadLevel(
      summary.communicationCount + summary.draftCount,
    );
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCommunicationsCalendarData(): Promise<CommunicationsCalendarData> {
  const supabase = await createClient();
  const today = getTodayDateString();

  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select(PLANNING_EVENT_SELECT)
    .order("date", { ascending: true });

  const events: CalendarEventEntry[] = eventsError
    ? []
    : mapEventRows((eventRows ?? []) as unknown as CoreEventRow[])
        .filter((event) => event.status !== "archived")
        .map((event) => ({
        id: `event-${event.id}`,
        eventId: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        status: event.status,
        communicationStrategy: event.communicationStrategy,
      }));

  const eventTitleById = new Map(events.map((event) => [event.eventId, event.title]));

  const { data: stepRows } = await supabase
    .from("event_communication_steps")
    .select(PLANNING_STEP_SELECT)
    .order("due_date", { ascending: true });

  const typedStepRows = (stepRows ?? []) as unknown as EventCommunicationStepRow[];
  const stepIds = typedStepRows.map((row) => row.id);

  const { data: draftItems } = stepIds.length
    ? await supabase
        .from("communication_items")
        .select("event_communication_step_id")
        .in("event_communication_step_id", stepIds)
    : { data: [] };

  const draftStepIds = new Set(
    (draftItems ?? [])
      .map((row) => row.event_communication_step_id as string | null)
      .filter(Boolean),
  );

  const communications: CalendarCommunicationEntry[] = typedStepRows
    .map((row) => {
      const step = mapEventCommunicationStepRow(row);
      return {
        id: step.id,
        eventId: step.eventId,
        eventTitle: eventTitleById.get(step.eventId) ?? "Event",
        stepTitle: step.title,
        dueDate: step.dueDate,
        channel: step.channel,
        status: step.status,
        hasDraft: draftStepIds.has(step.id),
      };
    })
    .filter((step) => eventTitleById.has(step.eventId));

  const { data: itemRows } = await supabase
    .from("communication_items")
    .select(PLANNING_ITEM_SELECT)
    .eq("status", "draft")
    .order("last_updated", { ascending: false });

  const items = (itemRows ?? []) as unknown as CommunicationItemRow[];
  const itemIds = items.map((row) => row.id);

  const { data: versionRows } = itemIds.length
    ? await supabase
        .from("communication_versions")
        .select("communication_item_id, version_number")
        .in("communication_item_id", itemIds)
        .order("version_number", { ascending: false })
    : { data: [] };

  const versionByItem = new Map<string, number>();
  for (const version of versionRows ?? []) {
    const itemId = version.communication_item_id as string;
    if (!versionByItem.has(itemId)) {
      versionByItem.set(itemId, version.version_number as number);
    }
  }

  const stepById = new Map(communications.map((entry) => [entry.id, entry]));

  const publishing: CalendarPublishingEntry[] = items
    .filter((row) => eventTitleById.has(row.event_id))
    .map((row) => {
      const stepId = row.event_communication_step_id;
      const step = stepId ? stepById.get(stepId) : undefined;
      const eventId = row.event_id;

      return {
        id: row.id,
        eventId,
        eventTitle: eventTitleById.get(eventId) ?? "Event",
        channel: row.channel as CommunicationChannel,
        status: row.status,
        dueDate: step?.dueDate ?? today,
        stepTitle: step?.stepTitle ?? null,
        versionNumber: versionByItem.get(row.id) ?? 1,
      };
    });

  const approvals: CalendarApprovalEntry[] = PLACEHOLDER_APPROVALS.map(
    (entry, index) => {
      const dueDate = addDaysToDateOnly(today, entry.dueDateOffset + index * 3);
      const event = events[index % events.length];

      return {
        id: entry.id,
        eventId: event?.eventId ?? "00000000-0000-0000-0000-000000000001",
        eventTitle: event?.title ?? entry.eventTitle,
        channel: entry.channel,
        dueDate,
        status: "pending",
        isPlaceholder: true,
      };
    },
  );

  const daySummaries = buildDaySummaries(events, communications, publishing);

  return {
    events,
    communications,
    publishing,
    approvals,
    daySummaries,
  };
}
