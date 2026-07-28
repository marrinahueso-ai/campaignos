import "server-only";

import { getAuthUser } from "@/lib/auth/queries";
import {
  FILES_EVENT_FETCH_CAP,
  FILES_ORG_FETCH_CAP,
} from "@/lib/campaign-files/constants";
import { mapCampaignFileRow } from "@/lib/campaign-files/filters";
import { resolveFilesOrgQueryScope } from "@/lib/campaign-files/org-scope";
import {
  areFileFoldersAvailable,
  getFileFoldersForEvent,
  getFileFoldersForEvents,
} from "@/lib/campaign-files/folder-queries";
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

/**
 * Active-org Files library (never all memberships).
 * RLS still allows multi-org membership rows — this filter is the tenant UX gate.
 */
export async function getCampaignFilesForOrganization(
  organizationId: string | null | undefined,
  options?: {
    limit?: number;
    /** When set, must belong to this organization or the result is empty. */
    eventId?: string | null;
  },
): Promise<{ files: CampaignFile[]; capped: boolean; cap: number }> {
  const cap = options?.limit ?? FILES_ORG_FETCH_CAP;
  if (!organizationId || !(await areEventPlaybookTablesAvailable())) {
    return { files: [], capped: false, cap };
  }

  const eventList = await getEventPlaybookEvents(organizationId);
  const scope = resolveFilesOrgQueryScope({
    orgEventIds: eventList.map((event) => event.id),
    requestedEventId: options?.eventId,
  });

  if (scope.kind === "none") {
    return { files: [], capped: false, cap };
  }

  if (scope.kind === "one") {
    return getCampaignFilesForEvent(scope.eventId, { limit: cap });
  }

  const files = await getCampaignFilesForEvents(scope.eventIds, {
    limit: cap + 1,
  });
  const capped = files.length > cap;
  return {
    files: capped ? files.slice(0, cap) : files,
    capped,
    cap,
  };
}

/**
 * @deprecated Use `getCampaignFilesForOrganization` — unscoped list leaked
 * files across orgs for multi-membership users.
 */
export async function getAllCampaignFiles(options?: {
  limit?: number;
}): Promise<{ files: CampaignFile[]; capped: boolean; cap: number }> {
  const organization = await getLatestOrganization();
  return getCampaignFilesForOrganization(organization?.id ?? null, {
    limit: options?.limit,
  });
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

  const file = mapCampaignFileRow(data as CampaignFileRow);

  // Active-org gate: membership RLS alone still allows other orgs' files.
  const organization = await getLatestOrganization().catch(() => null);
  if (!organization?.id) {
    return null;
  }
  const orgEvents = await getEventPlaybookEvents(organization.id).catch(() => []);
  if (!orgEvents.some((event) => event.id === file.eventId)) {
    return null;
  }

  return file;
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
    foldersAvailable: false,
    foldersByEventId: {},
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
  const loaded = await getCampaignFilesForOrganization(organization?.id ?? null, {
    limit: FILES_ORG_FETCH_CAP,
    eventId,
  });
  const files = loaded.files;

  const eventTitles = new Map(
    eventList.map((event) => [event.id, { title: event.title, date: event.date }]),
  );

  // Never surface foreign-org event ids (defense in depth).
  const orgEventIdSet = new Set(eventList.map((event) => event.id));
  const scopedEventId =
    eventId && orgEventIdSet.has(eventId) ? eventId : undefined;

  const folderCounts = new Map<string, number>();
  for (const file of files) {
    if (file.folderId) {
      folderCounts.set(file.folderId, (folderCounts.get(file.folderId) ?? 0) + 1);
    }
  }

  const eventIdsForFolders = scopedEventId
    ? [scopedEventId]
    : Array.from(new Set(files.map((file) => file.eventId)));

  const [foldersAvailable, foldersByEventId] = await Promise.all([
    areFileFoldersAvailable(),
    getFileFoldersForEvents(eventIdsForFolders, folderCounts),
  ]);

  const eventIds = scopedEventId
    ? [scopedEventId]
    : Array.from(new Set(files.map((file) => file.eventId)));

  const artworkMap = await getEventArtworkMap(eventIds);

  const events = scopedEventId
    ? eventList
        .filter((event) => event.id === scopedEventId)
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
    foldersAvailable,
    foldersByEventId,
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
      foldersAvailable: false,
      foldersByEventId: {},
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

  const folderCounts = new Map<string, number>();
  for (const file of files) {
    if (file.folderId) {
      folderCounts.set(file.folderId, (folderCounts.get(file.folderId) ?? 0) + 1);
    }
  }

  const [foldersAvailable, folders] = await Promise.all([
    areFileFoldersAvailable(),
    getFileFoldersForEvent(event.id, folderCounts),
  ]);

  return {
    tablesAvailable,
    foldersAvailable,
    foldersByEventId: { [event.id]: folders },
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
