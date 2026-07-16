import { cache } from "react";
import { displayDraftContent } from "@/lib/ai/content";
import {
  selectHeroArtwork,
  type HeroArtworkSelection,
} from "@/lib/event-workspace/select-hero-artwork";
import { createClient } from "@/lib/supabase/server";
import {
  mapApprovalRequestRow,
  mapCommunicationItemRow,
  mapEventAssetRows,
  mapLatestContentByItemId,
} from "@/lib/event-workspace/mappers";
import type {
  ApprovalRequestRow,
  CommunicationItemRow,
  CommunicationVersionRow,
  EventAssetRow,
} from "@/types/event-workspace";

/** Columns required by selectHeroArtwork / mapEventAssetRow (no generation blobs). */
const EVENT_ASSET_SELECT = [
  "id",
  "event_id",
  "asset_type",
  "filename",
  "storage_path",
  "status",
  "ai_generated",
  "plan_status",
  "plan_label",
  "created_at",
  "updated_at",
].join(", ");

const COMMUNICATION_ITEM_SELECT = [
  "id",
  "event_id",
  "channel",
  "event_communication_step_id",
  "status",
  "last_updated",
  "is_published",
  "created_at",
  "updated_at",
].join(", ");

const APPROVAL_REQUEST_SELECT = [
  "id",
  "event_id",
  "communication_item_id",
  "status",
].join(", ");

export async function getEventArtwork(
  eventId: string,
): Promise<HeroArtworkSelection | null> {
  const artworkMap = await getEventArtworkMap([eventId]);
  return artworkMap.get(eventId) ?? null;
}

/**
 * Batch hero artwork by exact eventId. Request-cached by sorted id key so
 * Event Detail shell + Files tab do not double-fetch in the same render.
 */
export async function getEventArtworkMap(
  eventIds: string[],
): Promise<Map<string, HeroArtworkSelection | null>> {
  const uniqueSorted = [...new Set(eventIds.filter(Boolean))].sort();
  return getEventArtworkMapCached(uniqueSorted.join("\0"));
}

const getEventArtworkMapCached = cache(
  async (cacheKey: string): Promise<Map<string, HeroArtworkSelection | null>> => {
    const eventIds = cacheKey.length > 0 ? cacheKey.split("\0") : [];
    return loadEventArtworkMap(eventIds);
  },
);

async function loadEventArtworkMap(
  eventIds: string[],
): Promise<Map<string, HeroArtworkSelection | null>> {
  const map = new Map<string, HeroArtworkSelection | null>();
  if (eventIds.length === 0) {
    return map;
  }

  const supabase = await createClient();

  const [assetsResult, communicationsResult, approvalsResult, eventsResult] =
    await Promise.all([
      supabase
        .from("event_assets")
        .select(EVENT_ASSET_SELECT)
        .in("event_id", eventIds),
      supabase
        .from("communication_items")
        .select(COMMUNICATION_ITEM_SELECT)
        .in("event_id", eventIds),
      supabase
        .from("approval_requests")
        .select(APPROVAL_REQUEST_SELECT)
        .in("event_id", eventIds),
      supabase
        .from("events")
        .select("id, approved_square_image_url, approved_square_image_status")
        .in("id", eventIds),
    ]);

  if (assetsResult.error?.code === "42P01") {
    for (const eventId of eventIds) {
      map.set(eventId, null);
    }
    return map;
  }

  const communicationRows = (communicationsResult.data ??
    []) as unknown as CommunicationItemRow[];
  const contentMap = await getLatestContentMap(
    communicationRows.map((row) => row.id),
  );

  const assetsByEvent = groupByEventId(
    mapEventAssetRows(
      (assetsResult.data ?? []) as unknown as EventAssetRow[],
    ),
  );
  const communicationsByEvent = groupByEventId(
    communicationRows.map((row) =>
      mapCommunicationItemRow(
        row,
        displayDraftContent(contentMap.get(row.id) ?? null),
      ),
    ),
  );
  const approvalsByEvent = groupByEventId(
    ((approvalsResult.data ?? []) as unknown as ApprovalRequestRow[]).map(
      (row) => mapApprovalRequestRow(row),
    ),
  );
  const approvedSquareByEvent = new Map<string, string | null>();
  for (const row of eventsResult.data ?? []) {
    const eventRow = row as {
      id: string;
      approved_square_image_url?: string | null;
      approved_square_image_status?: string | null;
    };
    approvedSquareByEvent.set(
      eventRow.id,
      eventRow.approved_square_image_status === "filled"
        ? (eventRow.approved_square_image_url ?? null)
        : null,
    );
  }

  for (const eventId of eventIds) {
    map.set(
      eventId,
      selectHeroArtwork({
        assets: assetsByEvent.get(eventId) ?? [],
        communications: communicationsByEvent.get(eventId) ?? [],
        approvalRequests: approvalsByEvent.get(eventId) ?? [],
        approvedSquareImageUrl: approvedSquareByEvent.get(eventId) ?? null,
      }),
    );
  }

  return map;
}

async function getLatestContentMap(
  itemIds: string[],
): Promise<Map<string, string>> {
  if (itemIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("communication_versions")
    .select("communication_item_id, version_number, content")
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  return mapLatestContentByItemId((data ?? []) as CommunicationVersionRow[]);
}

function groupByEventId<T extends { eventId: string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.eventId) ?? [];
    list.push(item);
    map.set(item.eventId, list);
  }
  return map;
}
