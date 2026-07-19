import "server-only";

import { cache } from "react";
import { resolveCalendarPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import {
  PLANNING_APPROVAL_SELECT,
  PLANNING_ASSET_SELECT,
  PLANNING_EVENT_SELECT,
  PLANNING_ITEM_SELECT,
  PLANNING_SCHEDULE_SELECT,
  PLANNING_STEP_SELECT,
  PLANNING_VERSION_SELECT,
} from "@/lib/communications-calendar/planning-selects";
import { getEventsInDateRange } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  ApprovalRequestRow,
  CommunicationItemRow,
  CommunicationVersionRow,
  EventAssetRow,
  PublicationScheduleRow,
} from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";
import type { EventRow as CoreEventRow } from "@/types";

export interface PlanningRawData {
  eventRows: CoreEventRow[];
  stepRows: EventCommunicationStepRow[];
  itemRows: CommunicationItemRow[];
  versionRows: CommunicationVersionRow[];
  assetRows: EventAssetRow[];
  approvalRows: ApprovalRequestRow[];
  scheduleRows: PublicationScheduleRow[];
}

const EMPTY_PLANNING_RAW: PlanningRawData = {
  eventRows: [],
  stepRows: [],
  itemRows: [],
  versionRows: [],
  assetRows: [],
  approvalRows: [],
  scheduleRows: [],
};

/**
 * Request-scoped cache: planning tables scoped to the active school-year window.
 */
export const fetchPlanningRawData = cache(
  async (schoolYear?: string | null): Promise<PlanningRawData> => {
    const window = resolveCalendarPlanningWindow(schoolYear);
    const events = await getEventsInDateRange(window.startDate, window.endDate);
    return fetchPlanningRawDataForEvents(events.map((event) => event.id));
  },
);

/** Scoped fetch for Today, Campaigns, and other pages that only need a subset of events. */
export async function fetchPlanningRawDataForEvents(
  eventIds: string[],
): Promise<PlanningRawData> {
  if (eventIds.length === 0) {
    return EMPTY_PLANNING_RAW;
  }

  const supabase = await createClient();

  const [
    { data: eventRows },
    { data: stepRows },
    { data: itemRows },
    { data: assetRows },
    { data: approvalRows },
    { data: scheduleRows },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(PLANNING_EVENT_SELECT)
      .in("id", eventIds)
      .order("date", { ascending: true }),
    supabase
      .from("event_communication_steps")
      .select(PLANNING_STEP_SELECT)
      .in("event_id", eventIds)
      .order("due_date"),
    supabase
      .from("communication_items")
      .select(PLANNING_ITEM_SELECT)
      .in("event_id", eventIds),
    supabase
      .from("event_assets")
      .select(PLANNING_ASSET_SELECT)
      .in("event_id", eventIds),
    supabase
      .from("approval_requests")
      .select(PLANNING_APPROVAL_SELECT)
      .in("event_id", eventIds),
    supabase
      .from("publication_schedule")
      .select(PLANNING_SCHEDULE_SELECT)
      .in("event_id", eventIds),
  ]);

  const scopedItems = (itemRows ?? []) as unknown as CommunicationItemRow[];
  const itemIds = scopedItems.map((row) => row.id);

  let versionRows: CommunicationVersionRow[] = [];
  if (itemIds.length > 0) {
    const { data } = await supabase
      .from("communication_versions")
      .select(PLANNING_VERSION_SELECT)
      .in("communication_item_id", itemIds)
      .order("version_number", { ascending: false });
    versionRows = (data ?? []) as unknown as CommunicationVersionRow[];
  }

  return {
    eventRows: (eventRows ?? []) as unknown as CoreEventRow[],
    stepRows: (stepRows ?? []) as unknown as EventCommunicationStepRow[],
    itemRows: scopedItems,
    versionRows,
    assetRows: (assetRows ?? []) as unknown as EventAssetRow[],
    approvalRows: (approvalRows ?? []) as unknown as ApprovalRequestRow[],
    scheduleRows: (scheduleRows ?? []) as unknown as PublicationScheduleRow[],
  };
}

export function buildLatestContentByItemId(
  versionRows: CommunicationVersionRow[],
): Map<string, { content: string; version: number }> {
  const contentByItemId = new Map<string, { content: string; version: number }>();

  for (const version of versionRows) {
    const itemId = version.communication_item_id;
    if (!contentByItemId.has(itemId)) {
      contentByItemId.set(itemId, {
        content: version.content,
        version: version.version_number,
      });
    }
  }

  return contentByItemId;
}
