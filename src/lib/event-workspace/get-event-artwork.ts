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

export async function getEventArtwork(
  eventId: string,
): Promise<HeroArtworkSelection | null> {
  const artworkMap = await getEventArtworkMap([eventId]);
  return artworkMap.get(eventId) ?? null;
}

export async function getEventArtworkMap(
  eventIds: string[],
): Promise<Map<string, HeroArtworkSelection | null>> {
  const map = new Map<string, HeroArtworkSelection | null>();
  if (eventIds.length === 0) {
    return map;
  }

  const supabase = await createClient();

  const [assetsResult, communicationsResult, approvalsResult, eventsResult] =
    await Promise.all([
      supabase.from("event_assets").select("*").in("event_id", eventIds),
      supabase.from("communication_items").select("*").in("event_id", eventIds),
      supabase.from("approval_requests").select("*").in("event_id", eventIds),
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
    []) as CommunicationItemRow[];
  const contentMap = await getLatestContentMap(
    communicationRows.map((row) => row.id),
  );

  const assetsByEvent = groupByEventId(
    mapEventAssetRows((assetsResult.data ?? []) as EventAssetRow[]),
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
    ((approvalsResult.data ?? []) as ApprovalRequestRow[]).map((row) =>
      mapApprovalRequestRow(row),
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
    .select("*")
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
