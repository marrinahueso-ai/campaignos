import "server-only";

import {
  isDuplicateKeyError,
  isMissingSchemaError,
} from "@/lib/creative-assets/schema-errors";
import { getEventAssetPublicUrl } from "@/lib/event-workspace/storage";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkConcept } from "@/lib/ai-artwork/types";

export type ActivateConceptResult =
  | { success: true }
  | { success: false; error: string };

function isIgnorableVersionInsertError(
  error: { code?: string; message?: string } | null,
): boolean {
  return isMissingSchemaError(error) || isDuplicateKeyError(error);
}

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

  if (isIgnorableVersionInsertError(error)) {
    return true;
  }

  if (error) {
    console.error("Failed to snapshot asset version:", error.message);
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

  if (isIgnorableVersionInsertError(error)) {
    return true;
  }

  if (error) {
    console.error("Failed to record concept version:", error.message);
  }

  return !error;
}

export async function activateConceptAsAsset(input: {
  eventId: string;
  assetId: string;
  concept: ArtworkConcept;
  uploadedBy: string | null;
}): Promise<ActivateConceptResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const storagePath = getEventAssetPublicUrl(input.concept.storagePath);

  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", input.assetId)
    .single();

  if (fetchError || !asset || asset.event_id !== input.eventId) {
    return { success: false, error: "Campaign artwork slot not found." };
  }

  const snapshotted = await snapshotAssetToVersion(asset, input.assetId);
  if (!snapshotted) {
    return {
      success: false,
      error: "Unable to archive the previous artwork version. Try again.",
    };
  }

  const currentVersion = (asset.current_version as number | undefined) ?? 1;
  const nextVersion =
    asset.status === "uploaded" && asset.storage_path ? currentVersion + 1 : currentVersion;

  const versionRecorded = await recordConceptAsVersion({
    assetId: input.assetId,
    versionNumber: nextVersion,
    filename: input.concept.filename,
    storagePath,
    uploadedBy: input.uploadedBy,
  });

  if (!versionRecorded) {
    return {
      success: false,
      error: "Unable to save the approved artwork version. Try again.",
    };
  }

  const updatePayload: Record<string, unknown> = {
    filename: input.concept.filename,
    storage_path: storagePath,
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
        storage_path: storagePath,
        status: "uploaded",
        ai_generated: true,
        updated_at: now,
      })
      .eq("id", input.assetId));
  }

  if (error) {
    console.error("Failed to activate artwork concept:", error.message);
    return {
      success: false,
      error: "Unable to save approved artwork to the campaign. Try again.",
    };
  }

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

  return { success: true };
}
