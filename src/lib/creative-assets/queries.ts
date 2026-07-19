import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { mapEventAssetRows } from "@/lib/event-workspace/mappers";
import { WORKSPACE_ASSET_SELECT } from "@/lib/event-workspace/selects";
import {
  mapBrandKitItemRow,
  mapEventAssetVersionRow,
  mapInspirationAsset,
} from "@/lib/creative-assets/mappers";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";
import { getActiveEvents } from "@/lib/events/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import type { BrandKitItem, InspirationAsset } from "@/lib/creative-assets/types";
import type { BrandAssets } from "@/types";
import type {
  EventAsset,
  EventAssetRow,
  EventAssetVersion,
  EventAssetVersionRow,
} from "@/types/event-workspace";
import type { BrandKitItemRow } from "@/lib/creative-assets/types";

/**
 * Full asset rows including generation JSON — used by AI/artwork generation paths.
 * Event Detail / inspiration UI should prefer getCampaignAssetsForEventDisplay.
 */
export async function getCampaignAssetsForEvent(
  eventId: string,
): Promise<EventAsset[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_assets")
    .select("*")
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch campaign assets:", error.message);
    return [];
  }

  return mapEventAssetRows((data ?? []) as EventAssetRow[]);
}

/** Lean assets for event detail / creative studio display (no generation JSON). */
export async function getCampaignAssetsForEventDisplay(
  eventId: string,
): Promise<EventAsset[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_assets")
    .select(WORKSPACE_ASSET_SELECT)
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch campaign assets (display):", error.message);
    return [];
  }

  return mapEventAssetRows((data ?? []) as EventAssetRow[]);
}

export async function getAssetVersionsForEvent(
  eventId: string,
): Promise<Map<string, EventAssetVersion[]>> {
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("event_assets")
    .select("id")
    .eq("event_id", eventId);

  const assetIds = (assets ?? []).map((row) => row.id as string);
  if (assetIds.length === 0) {
    return new Map();
  }

  const { data: versions, error } = await supabase
    .from("event_asset_versions")
    .select("*")
    .in("event_asset_id", assetIds)
    .order("version_number", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return new Map();
    }
    console.error("Failed to fetch asset versions:", error.message);
    return new Map();
  }

  const map = new Map<string, EventAssetVersion[]>();
  for (const row of (versions ?? []) as EventAssetVersionRow[]) {
    const version = mapEventAssetVersionRow(row);
    const list = map.get(version.eventAssetId) ?? [];
    list.push(version);
    map.set(version.eventAssetId, list);
  }

  return map;
}

export async function getInspirationAssets(): Promise<InspirationAsset[]> {
  const supabase = await createClient();
  const organization = await getLatestOrganization();

  const { data: assetRows, error } = await supabase
    .from("event_assets")
    .select(WORKSPACE_ASSET_SELECT)
    .eq("status", "uploaded")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch inspiration assets:", error.message);
    return [];
  }

  const assets = mapEventAssetRows((assetRows ?? []) as EventAssetRow[]);
  if (assets.length === 0) return [];

  const eventIds = [...new Set(assets.map((asset) => asset.eventId))];
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, date, status")
    .in("id", eventIds);

  const eventById = new Map(
    (eventRows ?? []).map((row) => [
      row.id as string,
      {
        title: row.title as string,
        date: row.date as string,
        status: row.status as string,
      },
    ]),
  );

  return assets
    .filter((asset) => {
      const event = eventById.get(asset.eventId);
      return event && event.status !== "archived";
    })
    .map((asset) => {
      const event = eventById.get(asset.eventId)!;
      return mapInspirationAsset({
        asset,
        eventTitle: event.title,
        eventDate: event.date,
        schoolYear: organization?.schoolYear ?? null,
      });
    });
}

export async function getBrandKitItems(
  organizationId: string,
): Promise<BrandKitItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_brand_kit_items")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch brand kit items:", error.message);
    return [];
  }

  return ((data ?? []) as BrandKitItemRow[]).map(mapBrandKitItemRow);
}

export async function getCreativeStudioContext(selectedEventId?: string | null) {
  const organization = await getLatestOrganization();
  const events = await getActiveEvents();
  const eventSummaries = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
  }));

  const resolvedEventId =
    selectedEventId && events.some((event) => event.id === selectedEventId)
      ? selectedEventId
      : (events[0]?.id ?? null);

  const [campaignAssets, assetVersions, inspirationAssets, brandKitItems, schoolProfile] =
    await Promise.all([
      // Full rows: Creative Studio panels read generationPrompt / settings.
      resolvedEventId ? getCampaignAssetsForEvent(resolvedEventId) : Promise.resolve([]),
      resolvedEventId ? getAssetVersionsForEvent(resolvedEventId) : Promise.resolve(new Map()),
      getInspirationAssets(),
      organization ? getBrandKitItems(organization.id) : Promise.resolve([]),
      organization ? getSchoolProfile() : Promise.resolve(null),
    ]);

  const organizationVoice = organization
    ? (await getAiProfileByOrganizationId(organization.id))?.organizationVoice ?? null
    : null;

  return {
    events: eventSummaries,
    selectedEventId: resolvedEventId,
    campaignAssets,
    assetVersions,
    inspirationAssets,
    brandKitItems,
    brandAssets: (schoolProfile?.brandAssets as BrandAssets | null) ?? null,
    organizationVoice,
    organizationId: organization?.id ?? null,
  };
}
