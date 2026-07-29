import "server-only";

import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";
import { detectFileType } from "@/lib/campaign-files/file-type";
import {
  buildCampaignFileStoragePath,
  getCampaignFilePublicUrl,
  resolveCampaignFileContentType,
} from "@/lib/campaign-files/storage";
import { logActivity } from "@/lib/event-playbooks/mutations";
import { createClient } from "@/lib/supabase/server";
import {
  mapDocumentCategoryToLegacyCategory,
} from "@/lib/campaign-files/document-category";
import type {
  CampaignFileCategory,
  CampaignFilePlatform,
  DocumentCategory,
} from "@/types/campaign-files";

interface UploadCampaignFileInput {
  eventId: string;
  file: File;
  category: CampaignFileCategory;
  documentCategory: DocumentCategory;
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

  // Callers already gate on isAllowedCampaignFile, but derive the stored
  // Content-Type from the extension ourselves rather than trusting
  // file.type — never serve a public file back as text/html.
  const contentType = resolveCampaignFileContentType(input.file.name);
  if (!contentType) {
    return { id: null, error: "Unsupported file type." };
  }

  const { error: uploadError } = await supabase.storage
    .from(CAMPAIGN_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
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
      document_category: input.documentCategory,
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
    documentCategory?: DocumentCategory;
    platforms?: CampaignFilePlatform[];
    status?: "active" | "pending" | "archived";
  },
): Promise<boolean> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name;

  let filenameForCategory =
    input.name ??
    (typeof updates.name === "string" ? updates.name : undefined);
  let mimeTypeForCategory: string | null | undefined;

  if (input.documentCategory !== undefined) {
    if (!filenameForCategory) {
      const { data: existing } = await supabase
        .from("event_playbook_files")
        .select("name, mime_type")
        .eq("id", fileId)
        .maybeSingle();
      filenameForCategory = (existing?.name as string | undefined) ?? "";
      mimeTypeForCategory = (existing?.mime_type as string | null | undefined) ?? null;
    }

    updates.document_category = input.documentCategory;
    updates.category =
      input.category ??
      mapDocumentCategoryToLegacyCategory(
        input.documentCategory,
        filenameForCategory,
        mimeTypeForCategory,
      );
  } else if (input.category !== undefined) {
    updates.category = input.category;
  }
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
