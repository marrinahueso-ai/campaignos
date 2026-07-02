import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import {
  recordConceptAsVersion,
  snapshotAssetToVersion,
} from "@/lib/ai-artwork/versions";
import { createClient } from "@/lib/supabase/server";

export async function activateExternalArtworkOnAsset(input: {
  eventId: string;
  assetId: string;
  storagePath: string;
  filename: string;
  uploadedBy: string | null;
  generationPrompt?: string | null;
  aiGenerated?: boolean;
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
  if (!snapshotted) {
    return false;
  }

  const currentVersion = (asset.current_version as number | undefined) ?? 1;
  const nextVersion =
    asset.status === "uploaded" && asset.storage_path ? currentVersion + 1 : currentVersion;

  await recordConceptAsVersion({
    assetId: input.assetId,
    versionNumber: nextVersion,
    filename: input.filename,
    storagePath: input.storagePath,
    uploadedBy: input.uploadedBy,
  });

  const updatePayload: Record<string, unknown> = {
    filename: input.filename,
    storage_path: input.storagePath,
    status: "uploaded",
    ai_generated: input.aiGenerated ?? false,
    plan_status: "approved",
    generation_prompt: input.generationPrompt ?? null,
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
        filename: input.filename,
        storage_path: input.storagePath,
        status: "uploaded",
        ai_generated: input.aiGenerated ?? false,
        updated_at: now,
      })
      .eq("id", input.assetId));
  }

  if (error) {
    return false;
  }

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("event_asset_id", input.assetId)
    .eq("status", "pending");

  return true;
}
