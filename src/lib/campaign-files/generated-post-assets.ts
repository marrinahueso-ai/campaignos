import "server-only";

import {
  dedupePostGraphicCandidates,
  groupPostGraphicCandidateIdsByStoragePath,
} from "@/lib/campaign-files/generated-post-asset-dedupe";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { createClient } from "@/lib/supabase/server";
import type { CreativePlanStatus, EventAssetType } from "@/types/event-workspace";

export type GeneratedPostAssetStatus = "posted" | "scheduled";

export interface GeneratedPostAsset {
  id: string;
  eventId: string;
  label: string;
  imageUrl: string | null;
  status: GeneratedPostAssetStatus | null;
  filename: string | null;
}

const POST_GRAPHIC_ASSET_TYPES = new Set<EventAssetType>([
  "facebook_graphic",
  "instagram_graphic",
  "instagram_story",
  "square_graphic",
  "newsletter_banner",
  "email_header",
  "flyer",
]);

type AssetRow = {
  id: string;
  event_id: string;
  asset_type: EventAssetType;
  filename: string | null;
  storage_path: string | null;
  status: string;
  ai_generated: boolean | null;
  plan_label: string | null;
  plan_status: CreativePlanStatus | null;
  updated_at: string | null;
};

type SlotRow = {
  event_asset_id: string | null;
  status: string;
  published_at: string | null;
  scheduled_for: string | null;
};

function isPostGraphicAsset(row: AssetRow): boolean {
  if (row.status !== "uploaded" || !row.storage_path) {
    return false;
  }

  if (row.ai_generated || row.plan_label?.trim()) {
    return true;
  }

  return POST_GRAPHIC_ASSET_TYPES.has(row.asset_type);
}

function resolveAssetLabel(row: AssetRow): string {
  if (row.plan_label?.trim()) {
    return row.plan_label.trim();
  }
  if (row.filename?.trim()) {
    return row.filename.trim();
  }
  return "Post graphic";
}

function resolveSlotStatus(
  slots: SlotRow[],
): GeneratedPostAssetStatus | null {
  const published = slots.some(
    (slot) =>
      slot.status === "published" ||
      Boolean(slot.published_at?.trim()),
  );
  if (published) {
    return "posted";
  }

  const scheduled = slots.some(
    (slot) =>
      slot.status === "scheduled" ||
      slot.status === "approved" ||
      Boolean(slot.scheduled_for?.trim()),
  );
  if (scheduled) {
    return "scheduled";
  }

  return null;
}

function resolvePlanStatus(
  planStatus: CreativePlanStatus | null,
): GeneratedPostAssetStatus | null {
  if (planStatus === "published") {
    return "posted";
  }
  if (planStatus === "approved") {
    return "scheduled";
  }
  return null;
}

export async function getGeneratedPostAssetsForEvent(
  eventId: string,
): Promise<GeneratedPostAsset[]> {
  const supabase = await createClient();

  const { data: assetRows, error: assetError } = await supabase
    .from("event_assets")
    .select(
      "id, event_id, asset_type, filename, storage_path, status, ai_generated, plan_label, plan_status, updated_at",
    )
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (assetError) {
    if (assetError.code === "42P01") {
      return [];
    }
    console.error(
      "Failed to fetch generated post assets:",
      assetError.message,
    );
    return [];
  }

  const filtered = ((assetRows ?? []) as AssetRow[]).filter(isPostGraphicAsset);
  if (filtered.length === 0) {
    return [];
  }

  const siblingIdsByStoragePath = groupPostGraphicCandidateIdsByStoragePath(filtered);
  const candidates = dedupePostGraphicCandidates(filtered);

  const assetIds = filtered.map((row) => row.id);
  const { data: slotRows } = await supabase
    .from("meta_publication_slots")
    .select("event_asset_id, status, published_at, scheduled_for")
    .eq("event_id", eventId)
    .in("event_asset_id", assetIds);

  const slotsByAssetId = new Map<string, SlotRow[]>();
  for (const row of (slotRows ?? []) as SlotRow[]) {
    if (!row.event_asset_id) {
      continue;
    }
    const list = slotsByAssetId.get(row.event_asset_id) ?? [];
    list.push(row);
    slotsByAssetId.set(row.event_asset_id, list);
  }

  return candidates.map((row) => {
    const path = row.storage_path?.trim();
    const relatedAssetIds = path
      ? (siblingIdsByStoragePath.get(path) ?? [row.id])
      : [row.id];
    const slots = relatedAssetIds.flatMap(
      (assetId) => slotsByAssetId.get(assetId) ?? [],
    );
    const status =
      resolveSlotStatus(slots) ??
      relatedAssetIds.reduce<GeneratedPostAssetStatus | null>((best, assetId) => {
        const sibling = filtered.find((entry) => entry.id === assetId);
        const planStatus = resolvePlanStatus(sibling?.plan_status ?? null);
        if (planStatus === "posted") return "posted";
        if (planStatus === "scheduled" && best !== "posted") return "scheduled";
        return best;
      }, resolvePlanStatus(row.plan_status ?? null));

    return {
      id: row.id,
      eventId: row.event_id,
      label: resolveAssetLabel(row),
      imageUrl: resolveAssetImageUrl(row.storage_path),
      status,
      filename: row.filename,
    };
  });
}
