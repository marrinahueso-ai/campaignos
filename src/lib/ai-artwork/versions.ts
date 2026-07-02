import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkConcept } from "@/lib/ai-artwork/types";

export async function snapshotAssetToVersion(
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

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}

export async function recordConceptAsVersion(input: {
  assetId: string;
  versionNumber: number;
  filename: string;
  storagePath: string;
  uploadedBy: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_asset_versions").insert({
    event_asset_id: input.assetId,
    version_number: input.versionNumber,
    filename: input.filename,
    storage_path: input.storagePath,
    uploaded_by: input.uploadedBy,
  });

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}

export async function activateConceptAsAsset(input: {
  eventId: string;
  assetId: string;
  concept: ArtworkConcept;
  uploadedBy: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", input.assetId)
    .single();

  if (fetchError || !asset || asset.event_id !== input.eventId) {
    return false;
  }

  const snapshotted = await snapshotAssetToVersion(asset, input.assetId);
  if (!snapshotted) return false;

  const currentVersion = (asset.current_version as number | undefined) ?? 1;
  const nextVersion =
    asset.status === "uploaded" && asset.storage_path ? currentVersion + 1 : currentVersion;

  await recordConceptAsVersion({
    assetId: input.assetId,
    versionNumber: nextVersion,
    filename: input.concept.filename,
    storagePath: input.concept.storagePath,
    uploadedBy: input.uploadedBy,
  });

  const updatePayload: Record<string, unknown> = {
    filename: input.concept.filename,
    storage_path: input.concept.storagePath,
    status: "uploaded",
    ai_generated: true,
    plan_status: "approved",
    generation_prompt: input.concept.generationPrompt,
    uploaded_by: input.uploadedBy,
    current_version: nextVersion,
    updated_at: now,
  };

  let { error } = await supabase
    .from("event_assets")
    .update(updatePayload)
    .eq("id", input.assetId);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase
      .from("event_assets")
      .update({
        filename: input.concept.filename,
        storage_path: input.concept.storagePath,
        status: "uploaded",
        ai_generated: true,
        updated_at: now,
      })
      .eq("id", input.assetId));
  }

  if (error) return false;

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("event_asset_id", input.assetId)
    .eq("status", "pending")
    .neq("id", input.concept.id);

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "approved" })
    .eq("id", input.concept.id);

  return true;
}
