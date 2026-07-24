import "server-only";

import { getAuthUser } from "@/lib/auth/queries";
import {
  FILES_EVENT_FETCH_CAP,
  FILES_ORG_FETCH_CAP,
} from "@/lib/campaign-files/constants";
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

export async function getAllCampaignFiles(options?: {
  limit?: number;
}): Promise<{ files: CampaignFile[]; capped: boolean; cap: number }> {
  const cap = options?.limit ?? FILES_ORG_FETCH_CAP;
  if (!(await areEventPlaybookTablesAvailable())) {
    return { files: [], capped: false, cap };
  }

  const supabase = await createClient();
  // Fetch one extra row to detect whether the soft cap truncated the library.
  const { data, error } = await supabase
    .from("event_playbook_files")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(cap + 1);

  if (error) {
    if (isMissingSchemaError(error)) {
      return { files: [], capped: false, cap };
    }
    console.error("Failed to fetch campaign files:", error.message);
    return { files: [], capped: false, cap };
  }

  const rows = (data ?? []) as CampaignFileRow[];
  const capped = rows.length > cap;
  const files = (capped ? rows.slice(0, cap) : rows).map(mapCampaignFileRow);
  return { files, capped, cap };
}

export async function getCampaignFilesForEvent(
  eventId: string,
  options?: { limit?: number },
): Promise<{ files: CampaignFile[]; capped: boolean; cap: number }> {
  const cap = options?.limit ?? FILES_EVENT_FETCH_CAP;
  const files = await getCampaignFilesForEvents([eventId], {
    limit: cap + 1,
  });
  const capped = files.length > cap;
  return {
    files: capped ? files.slice(0, cap) : files,
    capped,
    cap,
  };
}

/** One query for many events — avoids N+1 on vendor Documents / multi-event views. */
export async function getCampaignFilesForEvents(
  eventIds: string[],
  options?: { limit?: number },
): Promise<CampaignFile[]> {
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [];
  }

  if (!(await areEventPlaybookTablesAvailable())) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("event_playbook_files")
    .select("*")
    .in("event_id", uniqueIds)
    .order("uploaded_at", { ascending: false });

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    console.error("Failed to fetch campaign files for events:", error.message);
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
    listCapped: false,
    listCap: FILES_ORG_FETCH_CAP,
  };

  if (!tablesAvailable) {
    return empty;
  }

  const eventList = await getEventPlaybookEvents(organization?.id ?? null);
  const loaded = eventId
    ? await getCampaignFilesForEvent(eventId)
    : await getAllCampaignFiles({ limit: FILES_ORG_FETCH_CAP });
  const files = loaded.files;

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
    listCapped: loaded.capped,
    listCap: loaded.cap,
  };
}

/** Event Detail Files tab — exact eventId files only (no org event list). */
export async function getFilesPageDataForEvent(
  event: import("@/types").Event,
): Promise<FilesPageData> {
  const [tablesAvailable, authUser] = await Promise.all([
    areEventPlaybookTablesAvailable(),
    getAuthUser(),
  ]);

  if (!tablesAvailable) {
    return {
      tablesAvailable,
      files: [],
      events: [],
      eventList: [],
      uploaderNames: [],
      currentUserName: authUser?.displayName ?? null,
      listCapped: false,
      listCap: FILES_EVENT_FETCH_CAP,
    };
  }

  const loaded = await getCampaignFilesForEvent(event.id);
  const files = loaded.files;
  const artworkMap = await getEventArtworkMap([event.id]);

  return {
    tablesAvailable,
    files,
    events: [
      {
        eventId: event.id,
        title: event.title,
        date: event.date,
        artwork: artworkMap.get(event.id) ?? null,
        fileCount: files.length,
      },
    ],
    eventList: [event],
    uploaderNames: collectUploaderNames(files),
    currentUserName: authUser?.displayName ?? null,
    listCapped: loaded.capped,
    listCap: loaded.cap,
  };
}
