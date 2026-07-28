import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";

export async function createFileFolder(input: {
  eventId: string;
  organizationId: string;
  name: string;
  sortOrder?: number;
}): Promise<{ id: string | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { id: null, error: "Folder name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_file_folders")
    .insert({
      event_id: input.eventId,
      organization_id: input.organizationId,
      name,
      sort_order: input.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { id: null, error: "A folder with that name already exists." };
    }
    if (isMissingSchemaError(error)) {
      return { id: null, error: "Folders are not available yet." };
    }
    console.error("Failed to create file folder:", error.message);
    return { id: null, error: "Unable to create folder." };
  }

  return { id: data.id as string, error: null };
}

export async function renameFileFolder(
  folderId: string,
  name: string,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Folder name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_file_folders")
    .update({
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", folderId);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A folder with that name already exists." };
    }
    console.error("Failed to rename file folder:", error.message);
    return { success: false, error: "Unable to rename folder." };
  }

  return { success: true, error: null };
}

export async function deleteFileFolder(
  folderId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_file_folders")
    .delete()
    .eq("id", folderId);

  if (error) {
    console.error("Failed to delete file folder:", error.message);
    return { success: false, error: "Unable to delete folder." };
  }

  return { success: true, error: null };
}

export async function reorderFileFolders(input: {
  eventId: string;
  orderedFolderIds: string[];
}): Promise<{ success: boolean; error: string | null }> {
  if (input.orderedFolderIds.length === 0) {
    return { success: true, error: null };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const updates = input.orderedFolderIds.map((folderId, index) =>
    supabase
      .from("event_file_folders")
      .update({ sort_order: index, updated_at: now })
      .eq("id", folderId)
      .eq("event_id", input.eventId),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("Failed to reorder file folders:", failed.error.message);
    return { success: false, error: "Unable to reorder folders." };
  }

  return { success: true, error: null };
}

export async function moveCampaignFileToFolder(
  fileId: string,
  folderId: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_playbook_files")
    .update({
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId);

  if (error) {
    console.error("Failed to move file to folder:", error.message);
    return { success: false, error: "Unable to move file." };
  }

  return { success: true, error: null };
}
