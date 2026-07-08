import "server-only";

import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";
import { detectFileType } from "@/lib/campaign-files/file-type";
import {
  buildCampaignFileStoragePath,
  getCampaignFilePublicUrl,
} from "@/lib/campaign-files/storage";
import { logActivity } from "@/lib/event-playbooks/mutations";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignFileCategory,
  CampaignFilePlatform,
} from "@/types/campaign-files";

interface UploadCampaignFileInput {
  eventId: string;
  file: File;
  category: CampaignFileCategory;
  platforms: CampaignFilePlatform[];
  uploaderName: string | null;
}

export async function uploadCampaignFile(
  input: UploadCampaignFileInput,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const storagePath = buildCampaignFileStoragePath(input.eventId, input.file.name);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const fileType = detectFileType(input.file.name, input.file.type);

  const { error: uploadError } = await supabase.storage
    .from(CAMPAIGN_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload campaign file:", uploadError.message);
    return { id: null, error: "Unable to upload file. Please try again." };
  }

  const publicUrl = getCampaignFilePublicUrl(storagePath);

  const { data, error } = await supabase
    .from("event_playbook_files")
    .insert({
      event_id: input.eventId,
      name: input.file.name,
      url: publicUrl,
      storage_path: storagePath,
      file_type: fileType,
      category: input.category,
      platforms: input.platforms,
      status: "active",
      size_bytes: input.file.size,
      mime_type: input.file.type || null,
      uploader_name: input.uploaderName,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(CAMPAIGN_FILES_BUCKET).remove([storagePath]);
    console.error("Failed to save campaign file record:", error?.message);
    return { id: null, error: "Unable to save file record." };
  }

  await logActivity(input.eventId, `Uploaded file "${input.file.name}"`);
  return { id: data.id as string, error: null };
}

export async function updateCampaignFile(
  fileId: string,
  input: {
    name?: string;
    category?: CampaignFileCategory;
    platforms?: CampaignFilePlatform[];
    status?: "active" | "pending" | "archived";
  },
): Promise<boolean> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.category !== undefined) updates.category = input.category;
  if (input.platforms !== undefined) updates.platforms = input.platforms;
  if (input.status !== undefined) updates.status = input.status;

  const { error } = await supabase
    .from("event_playbook_files")
    .update(updates)
    .eq("id", fileId);

  return !error;
}

export async function deleteCampaignFile(fileId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: file, error: fetchError } = await supabase
    .from("event_playbook_files")
    .select("event_id, name, storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return false;
  }

  if (file.storage_path) {
    await supabase.storage
      .from(CAMPAIGN_FILES_BUCKET)
      .remove([file.storage_path as string]);
  }

  const { error } = await supabase
    .from("event_playbook_files")
    .delete()
    .eq("id", fileId);

  if (!error) {
    await logActivity(file.event_id as string, `Removed file "${file.name}"`);
  }

  return !error;
}
