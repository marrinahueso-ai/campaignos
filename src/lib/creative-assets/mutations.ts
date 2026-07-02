import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { uploadEventAsset } from "@/lib/event-workspace/mutations";
import type { EventAssetType } from "@/types/event-workspace";

async function snapshotCurrentVersion(
  asset: Record<string, unknown>,
  assetId: string,
): Promise<boolean> {
  if (asset.status !== "uploaded" || !asset.storage_path) {
    return true;
  }

  const supabase = await createClient();
  const currentVersion = (asset.current_version as number | undefined) ?? 1;

  const { error } = await supabase.from("event_asset_versions").insert({
    event_asset_id: assetId,
    version_number: currentVersion,
    filename: asset.filename,
    storage_path: asset.storage_path,
    uploaded_by: asset.uploaded_by,
    canva_url: asset.canva_url,
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      return true;
    }
    console.error("Failed to snapshot asset version:", error.message);
    return false;
  }

  return true;
}

export async function createCampaignAsset(
  eventId: string,
  assetType: EventAssetType,
  uploadedBy: string | null,
): Promise<string | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let { data, error } = await supabase
    .from("event_assets")
    .insert({
      event_id: eventId,
      asset_type: assetType,
      status: "pending",
      ai_generated: false,
      is_custom: true,
      uploaded_by: uploadedBy,
      current_version: 1,
      tags: [],
      is_favorite: false,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error && isMissingSchemaError(error)) {
    ({ data, error } = await supabase
      .from("event_assets")
      .insert({
        event_id: eventId,
        asset_type: assetType,
        status: "pending",
        ai_generated: false,
      })
      .select("id")
      .single());
  }

  if (error || !data) {
    console.error("Failed to create campaign asset:", error?.message);
    return null;
  }

  return data.id as string;
}

export async function deleteCampaignAsset(
  eventId: string,
  assetId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset || asset.event_id !== eventId) {
    return false;
  }

  if (asset.is_custom) {
    const { error } = await supabase.from("event_assets").delete().eq("id", assetId);
    return !error;
  }

  const resetPayload = {
    filename: null,
    storage_path: null,
    canva_url: null,
    status: "placeholder" as const,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from("event_assets").update(resetPayload).eq("id", assetId);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase
      .from("event_assets")
      .update({
        filename: null,
        storage_path: null,
        status: "placeholder",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId));
  }

  return !error;
}

export async function restoreCampaignAssetVersion(
  eventId: string,
  assetId: string,
  versionId: string,
  uploadedBy: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: asset, error: assetError }, { data: version, error: versionError }] =
    await Promise.all([
      supabase.from("event_assets").select("*").eq("id", assetId).single(),
      supabase.from("event_asset_versions").select("*").eq("id", versionId).single(),
    ]);

  if (
    assetError ||
    versionError ||
    !asset ||
    !version ||
    asset.event_id !== eventId ||
    version.event_asset_id !== assetId
  ) {
    return false;
  }

  const snapshotted = await snapshotCurrentVersion(asset, assetId);
  if (!snapshotted) return false;

  const nextVersion = ((asset.current_version as number | undefined) ?? 1) + 1;

  const { error } = await supabase
    .from("event_assets")
    .update({
      filename: version.filename,
      storage_path: version.storage_path,
      canva_url: version.canva_url,
      status: "uploaded",
      uploaded_by: uploadedBy,
      current_version: nextVersion,
      updated_at: now,
    })
    .eq("id", assetId);

  return !error;
}

export async function toggleInspirationFavorite(
  assetId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_assets")
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq("id", assetId);

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}

export async function duplicateInspirationToCampaign(
  sourceAssetId: string,
  targetEventId: string,
  uploadedBy: string | null,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", sourceAssetId)
    .single();

  if (sourceError || !source || source.status !== "uploaded") {
    return false;
  }

  let { data: created, error: createError } = await supabase
    .from("event_assets")
    .insert({
      event_id: targetEventId,
      asset_type: source.asset_type,
      filename: source.filename,
      storage_path: source.storage_path,
      status: "uploaded",
      ai_generated: false,
      is_custom: true,
      uploaded_by: uploadedBy,
      current_version: 1,
      tags: source.tags ?? [],
      is_favorite: false,
      canva_url: source.canva_url,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError && isMissingSchemaError(createError)) {
    ({ data: created, error: createError } = await supabase
      .from("event_assets")
      .insert({
        event_id: targetEventId,
        asset_type: source.asset_type,
        filename: source.filename,
        storage_path: source.storage_path,
        status: "uploaded",
        ai_generated: false,
      })
      .select("id")
      .single());
  }

  return !createError && Boolean(created);
}

export async function setCampaignAssetCanvaUrl(
  eventId: string,
  assetId: string,
  canvaUrl: string,
  uploadedBy: string | null,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset || asset.event_id !== eventId) {
    return false;
  }

  if (asset.status === "uploaded") {
    const snapshotted = await snapshotCurrentVersion(asset, assetId);
    if (!snapshotted) return false;
  }

  const nextVersion =
    asset.status === "uploaded"
      ? ((asset.current_version as number | undefined) ?? 1) + 1
      : ((asset.current_version as number | undefined) ?? 1);

  const { error } = await supabase
    .from("event_assets")
    .update({
      canva_url: canvaUrl,
      status: "uploaded",
      filename: asset.filename ?? "Canva design",
      uploaded_by: uploadedBy,
      current_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  return !error;
}

export { uploadEventAsset };

export async function uploadNewCampaignAsset(
  eventId: string,
  assetType: EventAssetType,
  file: File,
  uploadedBy: string | null,
): Promise<boolean> {
  const assetId = await createCampaignAsset(eventId, assetType, uploadedBy);
  if (!assetId) return false;
  return uploadEventAsset(eventId, assetId, file, uploadedBy);
}
