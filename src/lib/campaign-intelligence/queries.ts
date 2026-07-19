import {
  buildLatestContentByItemId,
  fetchPlanningRawDataForEvents,
  type PlanningRawData,
} from "@/lib/communications-calendar/planning-raw";
import {
  PLANNING_APPROVAL_SELECT,
  PLANNING_ASSET_SELECT,
  PLANNING_ITEM_SELECT,
  PLANNING_SCHEDULE_SELECT,
  PLANNING_STEP_SELECT,
  PLANNING_VERSION_SELECT,
} from "@/lib/communications-calendar/planning-selects";
import {
  calculateCampaignIntelligence,
  type CampaignIntelligence,
} from "@/lib/campaign-intelligence";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import { getHubCommunicationItems } from "@/lib/event-workspace/communication-items";
import {
  mapApprovalRequestRow,
  mapCommunicationItemRow,
  mapEventAssetRows,
  mapPublicationScheduleRow,
} from "@/lib/event-workspace/mappers";
import { mapEventCommunicationStepRow } from "@/lib/playbooks/mappers";
import { getTodayDateString } from "@/lib/utils/dates";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types";
import type { EventCommunicationStepRow } from "@/types/playbooks";
import type {
  ApprovalRequestRow,
  CommunicationItemRow,
  CommunicationVersionRow,
  EventAssetRow,
  PublicationScheduleRow,
} from "@/types/event-workspace";

async function getLatestContentMap(
  itemIds: string[],
): Promise<Map<string, string>> {
  if (itemIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("communication_versions")
    .select(PLANNING_VERSION_SELECT)
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  const map = new Map<string, string>();
  for (const row of (data ?? []) as unknown as CommunicationVersionRow[]) {
    if (!map.has(row.communication_item_id)) {
      map.set(row.communication_item_id, row.content);
    }
  }
  return map;
}

function groupByEventId<T extends { event_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
  }
  return map;
}

function buildIntelligenceInputsFromRaw(
  events: Event[],
  raw: PlanningRawData,
): Map<string, CampaignIntelligenceInput> {
  const map = new Map<string, CampaignIntelligenceInput>();
  if (events.length === 0) {
    return map;
  }

  const today = getTodayDateString();
  const eventIds = new Set(events.map((event) => event.id));
  const contentByItemId = buildLatestContentByItemId(raw.versionRows);

  const stepRows = raw.stepRows.filter((row) => eventIds.has(row.event_id));
  const assetRows = raw.assetRows.filter((row) => eventIds.has(row.event_id));
  const communicationRows = getHubCommunicationItems(
    raw.itemRows.filter((row) => eventIds.has(row.event_id)),
  );
  const approvalRows = raw.approvalRows.filter((row) => eventIds.has(row.event_id));
  const scheduleRows = raw.scheduleRows.filter((row) => eventIds.has(row.event_id));

  const stepsByEvent = groupByEventId(stepRows);
  const assetsByEvent = groupByEventId(assetRows);
  const communicationsByEvent = groupByEventId(communicationRows);
  const approvalsByEvent = groupByEventId(approvalRows);
  const scheduleByEvent = groupByEventId(scheduleRows);

  for (const event of events) {
    const eventId = event.id;
    map.set(eventId, {
      event,
      steps: (stepsByEvent.get(eventId) ?? []).map(mapEventCommunicationStepRow),
      assets: mapEventAssetRows(assetsByEvent.get(eventId) ?? []),
      communications: (communicationsByEvent.get(eventId) ?? []).map((row) =>
        mapCommunicationItemRow(
          row,
          contentByItemId.get(row.id)?.content ?? null,
        ),
      ),
      approvalRequests: (approvalsByEvent.get(eventId) ?? []).map((row) =>
        mapApprovalRequestRow(row),
      ),
      publicationSchedule: (scheduleByEvent.get(eventId) ?? []).map(
        mapPublicationScheduleRow,
      ),
      today,
    });
  }

  return map;
}

export async function getCampaignIntelligenceForEvent(
  event: Event,
): Promise<CampaignIntelligence> {
  const map = await getCampaignIntelligenceForEvents([event]);
  return (
    map.get(event.id) ??
    calculateCampaignIntelligence({
      event,
      steps: [],
      assets: [],
      communications: [],
      approvalRequests: [],
      publicationSchedule: [],
      today: getTodayDateString(),
    })
  );
}

export async function getCampaignIntelligenceForEvents(
  events: Event[],
): Promise<Map<string, CampaignIntelligence>> {
  const inputs = await fetchCampaignIntelligenceInputsForEvents(events);
  const map = new Map<string, CampaignIntelligence>();

  for (const [eventId, input] of inputs) {
    map.set(eventId, calculateCampaignIntelligence(input));
  }

  return map;
}

/**
 * Builds intelligence inputs from the request-scoped planning raw cache when available.
 * Used by the Today page to avoid duplicate Supabase round-trips.
 */
export async function getCampaignIntelligenceForEventsFromPlanningCache(
  events: Event[],
): Promise<Map<string, CampaignIntelligence>> {
  const raw = await fetchPlanningRawDataForEvents(events.map((event) => event.id));
  return getCampaignIntelligenceForEventsFromRaw(events, raw);
}

export function getCampaignIntelligenceForEventsFromRaw(
  events: Event[],
  raw: PlanningRawData,
): Map<string, CampaignIntelligence> {
  const inputs = buildIntelligenceInputsFromRaw(events, raw);
  const map = new Map<string, CampaignIntelligence>();

  for (const [eventId, input] of inputs) {
    map.set(eventId, calculateCampaignIntelligence(input));
  }

  return map;
}

export async function fetchCampaignIntelligenceInputsForEvents(
  events: Event[],
): Promise<Map<string, CampaignIntelligenceInput>> {
  const map = new Map<string, CampaignIntelligenceInput>();
  if (events.length === 0) {
    return map;
  }

  const today = getTodayDateString();
  const eventIds = events.map((event) => event.id);
  const supabase = await createClient();

  const [
    stepsResult,
    assetsResult,
    communicationsResult,
    approvalsResult,
    scheduleResult,
  ] = await Promise.all([
    supabase
      .from("event_communication_steps")
      .select(PLANNING_STEP_SELECT)
      .in("event_id", eventIds),
    supabase
      .from("event_assets")
      .select(PLANNING_ASSET_SELECT)
      .in("event_id", eventIds),
    supabase
      .from("communication_items")
      .select(PLANNING_ITEM_SELECT)
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

  const communicationRows = getHubCommunicationItems(
    (communicationsResult.data ?? []) as unknown as CommunicationItemRow[],
  );
  const contentMap = await getLatestContentMap(
    communicationRows.map((row) => row.id),
  );

  const stepsByEvent = groupByEventId(
    (stepsResult.data ?? []) as unknown as EventCommunicationStepRow[],
  );
  const assetsByEvent = groupByEventId((assetsResult.data ?? []) as unknown as EventAssetRow[]);
  const communicationsByEvent = groupByEventId(communicationRows);
  const approvalsByEvent = groupByEventId(
    (approvalsResult.data ?? []) as unknown as ApprovalRequestRow[],
  );
  const scheduleByEvent = groupByEventId(
    (scheduleResult.data ?? []) as unknown as PublicationScheduleRow[],
  );

  for (const event of events) {
    const eventId = event.id;
    map.set(eventId, {
      event,
      steps: (stepsByEvent.get(eventId) ?? []).map(mapEventCommunicationStepRow),
      assets: mapEventAssetRows(assetsByEvent.get(eventId) ?? []),
      communications: (communicationsByEvent.get(eventId) ?? []).map((row) =>
        mapCommunicationItemRow(row, contentMap.get(row.id) ?? null),
      ),
      approvalRequests: (approvalsByEvent.get(eventId) ?? []).map((row) =>
        mapApprovalRequestRow(row),
      ),
      publicationSchedule: (scheduleByEvent.get(eventId) ?? []).map(
        mapPublicationScheduleRow,
      ),
      today,
    });
  }

  return map;
}
