import "server-only";

import { getAuthUser } from "@/lib/auth/queries";
import { mapCampaignFileRow } from "@/lib/campaign-files/filters";
import { getEventArtworkMap } from "@/lib/event-workspace/get-event-artwork";
import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookEvents,
} from "@/lib/event-playbooks/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import type {
  CampaignFile,
  CampaignFileEventSummary,
  CampaignFileRow,
  FilesPageData,
} from "@/types/campaign-files";

export async function areCampaignFilesEnhanced(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_playbook_files")
    .select("category")
    .limit(1);

  return !error || !isMissingSchemaError(error);
}

export async function getAllCampaignFiles(): Promise<CampaignFile[]> {
  if (!(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_files")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch campaign files:", error.message);
    return [];
  }

  return ((data ?? []) as CampaignFileRow[]).map(mapCampaignFileRow);
}

export async function getCampaignFilesForEvent(eventId: string): Promise<CampaignFile[]> {
  if (!(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_files")
    .select("*")
    .eq("event_id", eventId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch event campaign files:", error.message);
    return [];
  }

  return ((data ?? []) as CampaignFileRow[]).map(mapCampaignFileRow);
}

export async function getCampaignFileById(fileId: string): Promise<CampaignFile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCampaignFileRow(data as CampaignFileRow);
}

function buildEventSummaries(
  files: CampaignFile[],
  eventTitles: Map<string, { title: string; date: string }>,
  artworkMap: Awaited<ReturnType<typeof getEventArtworkMap>>,
): CampaignFileEventSummary[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    counts.set(file.eventId, (counts.get(file.eventId) ?? 0) + 1);
  }

  const summaries: CampaignFileEventSummary[] = [];

  for (const [eventId, count] of counts) {
    const meta = eventTitles.get(eventId);
    if (!meta) {
      continue;
    }

    summaries.push({
      eventId,
      title: meta.title,
      date: meta.date,
      artwork: artworkMap.get(eventId) ?? null,
      fileCount: count,
    });
  }

  return summaries.sort((left, right) => left.title.localeCompare(right.title));
}

function collectUploaderNames(files: CampaignFile[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    if (file.uploaderName?.trim()) {
      names.add(file.uploaderName.trim());
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export async function getFilesPageData(eventId?: string): Promise<FilesPageData> {
  const [tablesAvailable, organization, authUser] = await Promise.all([
    areEventPlaybookTablesAvailable(),
    getLatestOrganization(),
    getAuthUser(),
  ]);

  const empty: FilesPageData = {
    tablesAvailable,
    files: [],
    events: [],
    eventList: [],
    uploaderNames: [],
    currentUserName: authUser?.displayName ?? null,
  };

  if (!tablesAvailable) {
    return empty;
  }

  const eventList = await getEventPlaybookEvents(organization?.id ?? null);
  const files = eventId
    ? await getCampaignFilesForEvent(eventId)
    : await getAllCampaignFiles();

  const eventTitles = new Map(
    eventList.map((event) => [event.id, { title: event.title, date: event.date }]),
  );

  const eventIds = eventId
    ? [eventId]
    : Array.from(new Set(files.map((file) => file.eventId)));

  const artworkMap = await getEventArtworkMap(eventIds);

  const events = eventId
    ? eventList
        .filter((event) => event.id === eventId)
        .map((event) => ({
          eventId: event.id,
          title: event.title,
          date: event.date,
          artwork: artworkMap.get(event.id) ?? null,
          fileCount: files.length,
        }))
    : buildEventSummaries(files, eventTitles, artworkMap);

  return {
    tablesAvailable,
    files,
    events,
    eventList,
    uploaderNames: collectUploaderNames(files),
    currentUserName: authUser?.displayName ?? null,
  };
}
