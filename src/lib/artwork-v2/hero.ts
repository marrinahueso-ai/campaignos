import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { ensurePlanAssetRow } from "@/lib/creative-director/mutations";
import { createClient } from "@/lib/supabase/server";
import type { EventAssetType } from "@/types/event-workspace";

const FEED_MILESTONE_ASSET_TYPES = new Set<EventAssetType>([
  "instagram_graphic",
  "square_graphic",
  "facebook_graphic",
]);

/** Sets the event hero image from the first approved 1:1 feed artwork only. */
export async function maybePromoteApprovedArtworkToHero(input: {
  eventId: string;
  assetType?: EventAssetType;
  storagePath: string;
  filename: string;
  generationPrompt: string;
  uploadedBy: string | null;
}): Promise<boolean> {
  const isFeedMilestonePromotion =
    input.assetType !== undefined &&
    FEED_MILESTONE_ASSET_TYPES.has(input.assetType);

  if (!isFeedMilestonePromotion) {
    return false;
  }

  const assets = await getCampaignAssetsForEvent(input.eventId);
  const existingHero = assets.find((asset) => asset.assetType === "hero_image");
  const hasHeroImage =
    existingHero?.status === "uploaded" && Boolean(existingHero.storagePath);

  if (hasHeroImage) {
    return false;
  }

  const heroAssetId =
    existingHero?.id ??
    (await ensurePlanAssetRow(input.eventId, "hero_image", "Hero Image"));

  if (!heroAssetId) {
    return false;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    filename: input.filename,
    storage_path: input.storagePath,
    status: "uploaded",
    ai_generated: true,
    plan_status: "approved",
    generation_prompt: input.generationPrompt,
    uploaded_by: input.uploadedBy,
    updated_at: now,
  };

  let { error } = await supabase
    .from("event_assets")
    .update(updatePayload)
    .eq("id", heroAssetId)
    .eq("event_id", input.eventId);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase
      .from("event_assets")
      .update({
        filename: input.filename,
        storage_path: input.storagePath,
        status: "uploaded",
        ai_generated: true,
        updated_at: now,
      })
      .eq("id", heroAssetId)
      .eq("event_id", input.eventId));
  }

  return !error;
}
