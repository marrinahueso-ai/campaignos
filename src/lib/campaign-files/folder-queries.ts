import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import type {
  CampaignFileFolder,
  CampaignFileFolderRow,
} from "@/types/campaign-files";

export async function areFileFoldersAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_file_folders")
    .select("id")
    .limit(1);

  return !error || !isMissingSchemaError(error);
}

function mapFolderRow(row: CampaignFileFolderRow): CampaignFileFolder {
  return {
    id: row.id,
    eventId: row.event_id,
    organizationId: row.organization_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachFileCounts(
  folders: CampaignFileFolder[],
  fileCounts?: Map<string, number>,
): CampaignFileFolder[] {
  return folders.map((folder) => ({
    ...folder,
    fileCount: fileCounts?.get(folder.id) ?? 0,
  }));
}

export async function getFileFoldersForEvent(
  eventId: string,
  fileCounts?: Map<string, number>,
): Promise<CampaignFileFolder[]> {
  if (!eventId || !(await areFileFoldersAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_file_folders")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch event file folders:", error.message);
    return [];
  }

  return attachFileCounts(
    ((data ?? []) as CampaignFileFolderRow[]).map(mapFolderRow),
    fileCounts,
  );
}

export async function getFileFoldersForEvents(
  eventIds: string[],
  fileCounts?: Map<string, number>,
): Promise<Record<string, CampaignFileFolder[]>> {
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));
  const empty: Record<string, CampaignFileFolder[]> = {};
  for (const eventId of uniqueIds) {
    empty[eventId] = [];
  }

  if (uniqueIds.length === 0 || !(await areFileFoldersAvailable())) {
    return empty;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_file_folders")
    .select("*")
    .in("event_id", uniqueIds)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return empty;
    }
    console.error("Failed to fetch event file folders:", error.message);
    return empty;
  }

  for (const row of (data ?? []) as CampaignFileFolderRow[]) {
    const folder = mapFolderRow(row);
    const withCount = attachFileCounts([folder], fileCounts)[0]!;
    empty[folder.eventId] = [...(empty[folder.eventId] ?? []), withCount];
  }

  return empty;
}

export async function getFileFolderById(
  folderId: string,
): Promise<CampaignFileFolder | null> {
  if (!(await areFileFoldersAvailable())) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_file_folders")
    .select("*")
    .eq("id", folderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapFolderRow(data as CampaignFileFolderRow);
}
