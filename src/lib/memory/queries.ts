import { createClient } from "@/lib/supabase/server";
import { PLANNING_ASSET_SELECT } from "@/lib/communications-calendar/planning-selects";
import { getAllEvents } from "@/lib/events/queries";
import { mapEventAssetRows } from "@/lib/event-workspace/mappers";
import { COMMUNICATION_CHANNELS, EVENT_ASSET_TYPES } from "@/lib/event-workspace/constants";
import { buildLessonsLearnedState } from "@/lib/memory/lessons";
import { buildReusePreview } from "@/lib/memory/reuse";
import { buildCampaignMemorySummary } from "@/lib/memory/summary";
import { buildMemoryTimeline } from "@/lib/memory/timeline";
import type {
  BuildEventMemoryInput,
  EventHistoryContext,
  EventMemory,
} from "@/lib/memory/types";
import type { Event } from "@/types";
import type {
  ApprovalRequest,
  CommunicationItem,
  EventAsset,
  EventAssetRow,
} from "@/types/event-workspace";

const VISUAL_ASSET_TYPES = new Set([
  "hero_image",
  "square_graphic",
  "instagram_story",
  "flyer",
]);

const DOCUMENT_ASSET_TYPES = new Set(["logo", "document"]);

function normalizeEventTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function deriveSchoolYear(eventDate: string, organizationYear: string | null): string | null {
  if (organizationYear) return organizationYear;

  const date = new Date(`${eventDate}T12:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  // US school year: July+ belongs to next label (e.g. Aug 2025 → 2025–2026)
  if (month >= 6) {
    return `${year}–${year + 1}`;
  }
  return `${year - 1}–${year}`;
}

function communicationStatusLabel(item: CommunicationItem): string {
  if (item.isPublished || item.status === "published") return "Published";
  if (item.status === "approved") return "Approved";
  if (item.status === "generated") return "Draft ready";
  if (item.status === "draft") return "In progress";
  return "Not started";
}

function channelLabel(channel: CommunicationItem["channel"]): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

function assetLabel(assetType: EventAsset["assetType"]): string {
  return (
    EVENT_ASSET_TYPES.find((entry) => entry.assetType === assetType)?.label ??
    assetType
  );
}

function buildCommunicationsCreated(
  communications: CommunicationItem[],
): EventMemory["communicationsCreated"] {
  return communications.map((item) => ({
    id: item.id,
    channelLabel: channelLabel(item.channel),
    statusLabel: communicationStatusLabel(item),
    isPublished: item.isPublished || item.status === "published",
    lastUpdated: item.lastUpdated,
  }));
}

function partitionAssets(assets: EventAsset[]): {
  artwork: EventMemory["artworkUsed"];
  files: EventMemory["filesUploaded"];
  photos: EventMemory["photos"];
} {
  const artwork: EventMemory["artworkUsed"] = [];
  const files: EventMemory["filesUploaded"] = [];
  const photos: EventMemory["photos"] = [];

  for (const asset of assets) {
    const label = assetLabel(asset.assetType);
    const statusLabel = asset.status === "uploaded" ? "Ready" : "Still needed";

    if (VISUAL_ASSET_TYPES.has(asset.assetType)) {
      artwork.push({
        id: asset.id,
        label,
        filename: asset.filename,
        statusLabel,
      });
      if (asset.assetType === "hero_image" && asset.status === "uploaded") {
        photos.push({
          id: asset.id,
          label,
          filename: asset.filename,
        });
      }
    } else if (DOCUMENT_ASSET_TYPES.has(asset.assetType)) {
      files.push({
        id: asset.id,
        label,
        filename: asset.filename,
      });
    }
  }

  return { artwork, files, photos };
}

function buildApprovalsCompleted(
  approvals: ApprovalRequest[],
  communications: CommunicationItem[],
): EventMemory["approvalsCompleted"] {
  return approvals.map((request) => {
    const comm = request.communicationItemId
      ? communications.find((item) => item.id === request.communicationItemId)
      : null;

    const label = comm ? channelLabel(comm.channel) : "Board approval";
    const statusLabel =
      request.status === "approved"
        ? "Ready"
        : request.status === "pending"
          ? "Waiting on"
          : "Needs your attention";

    return {
      id: request.id,
      label,
      statusLabel,
      resolvedAt: request.resolvedAt,
    };
  });
}

function buildPublishingHistory(
  schedule: BuildEventMemoryInput["workspace"]["publicationSchedule"],
  communications: CommunicationItem[],
): EventMemory["publishingHistory"] {
  return schedule.map((entry) => {
    const comm = entry.communicationItemId
      ? communications.find((item) => item.id === entry.communicationItemId)
      : null;

    const label = comm ? channelLabel(comm.channel) : "Scheduled send";
    const statusLabel =
      entry.status === "published"
        ? "Published"
        : entry.status === "scheduled"
          ? "Scheduled"
          : "Cancelled";

    return {
      id: entry.id,
      label,
      scheduledFor: entry.scheduledFor,
      statusLabel,
    };
  });
}

function buildVolunteers(event: Event): EventMemory["volunteersInvolved"] {
  if (!event.volunteerNeeds?.trim()) {
    return [];
  }

  return [
    {
      label: "Volunteer needs recorded",
      detail: event.volunteerNeeds,
    },
  ];

  // Future: volunteer sign-ups from Volunteer Engine
}

function buildNotes(event: Event): string | null {
  const parts = [
    event.description?.trim(),
    event.theme ? `Theme: ${event.theme}` : null,
    event.eventOwner ? `Lead: ${event.eventOwner}` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;
  return parts.join("\n\n");
}

function buildCampaignCompletion(
  input: BuildEventMemoryInput,
): EventMemory["campaignCompletion"] {
  const intelligence = input.campaignIntelligence;
  if (!intelligence || intelligence.readinessLabel === "calendar_only") {
    return null;
  }

  return {
    percent: intelligence.completionPercent,
    label: intelligence.readinessDisplay,
    finishedOnSchedule:
      intelligence.completionPercent >= 85 &&
      intelligence.overdueItems.length === 0,
  };
}

function resolveCompletedDate(
  timeline: BuildEventMemoryInput["workspace"]["timeline"],
  event: Event,
): string | null {
  const completed = timeline.find(
    (entry) => entry.activityType === "event_completed",
  );
  if (completed) return completed.occurredAt.split("T")[0] ?? completed.occurredAt;

  if (event.status === "archived" || event.status === "published") {
    return event.updatedAt?.split("T")[0] ?? event.date;
  }

  return null;
}

export function buildEventMemory(input: BuildEventMemoryInput): EventMemory {
  const { event, workspace } = input;
  const { artwork, files, photos } = partitionAssets(workspace.assets);
  const timeline = buildMemoryTimeline(
    input.timeline ?? workspace.timeline,
  );

  const campaignSummary = buildCampaignMemorySummary({
    event,
    communications: workspace.communications,
    assets: workspace.assets,
    intelligence: input.campaignIntelligence,
    steps: input.playbookSteps,
    publicationSchedule: workspace.publicationSchedule,
  });

  const partial: EventMemory = {
    eventId: event.id,
    schoolYear: deriveSchoolYear(event.date, input.schoolYear ?? null),
    eventTitle: event.title,
    campaignSummary,
    communicationsCreated: buildCommunicationsCreated(workspace.communications),
    artworkUsed: artwork,
    filesUploaded: files,
    volunteersInvolved: buildVolunteers(event),
    approvalsCompleted: buildApprovalsCompleted(
      workspace.approvalRequests,
      workspace.communications,
    ),
    publishingHistory: buildPublishingHistory(
      workspace.publicationSchedule,
      workspace.communications,
    ),
    photos,
    sponsors: [],
    notes: buildNotes(event),
    lessonsLearned: buildLessonsLearnedState(),
    campaignCompletion: buildCampaignCompletion(input),
    createdBy: event.eventOwner,
    completedDate: resolveCompletedDate(workspace.timeline, event),
    timeline,
    reusePreview: { items: [], hasReusableContent: false },
  };

  partial.reusePreview = buildReusePreview(partial);
  return partial;
}

export function findPriorRuns(event: Event, allEvents: Event[]): Event[] {
  const key = normalizeEventTitle(event.title);
  return allEvents
    .filter(
      (candidate) =>
        candidate.id !== event.id &&
        normalizeEventTitle(candidate.title) === key &&
        candidate.date < event.date,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function getUploadedAssetEventIds(eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_assets")
    .select(PLANNING_ASSET_SELECT)
    .in("event_id", eventIds)
    .eq("status", "uploaded");

  if (error?.code === "42P01" || !data) {
    return new Set();
  }

  const assets = mapEventAssetRows(data as EventAssetRow[]);
  const withVisual = new Set<string>();

  for (const asset of assets) {
    if (
      VISUAL_ASSET_TYPES.has(asset.assetType) &&
      !!(asset.filename || asset.storagePath)
    ) {
      withVisual.add(asset.eventId);
    }
  }

  return withVisual;
}

export function buildEventHistoryContext(
  event: Event,
  allEvents: Event[],
  artworkEventIds: Set<string>,
): EventHistoryContext {
  const priorRuns = findPriorRuns(event, allEvents);

  return {
    eventId: event.id,
    priorRunCount: priorRuns.length,
    totalRunCount: priorRuns.length + 1,
    hasPriorArtwork: priorRuns.some((run) => artworkEventIds.has(run.id)),
    lastRunDate: priorRuns[0]?.date ?? null,
    lastRunEventId: priorRuns[0]?.id ?? null,
    priorEventIds: priorRuns.map((run) => run.id),
  };
}

export async function getEventHistoryContext(event: Event): Promise<EventHistoryContext> {
  const allEvents = await getAllEvents();
  const priorRuns = findPriorRuns(event, allEvents);
  const artworkEventIds = await getUploadedAssetEventIds(
    priorRuns.map((run) => run.id),
  );
  return buildEventHistoryContext(event, allEvents, artworkEventIds);
}

export async function getMemoryHintsForEvents(
  events: Event[],
): Promise<Map<string, EventHistoryContext>> {
  if (events.length === 0) return new Map();

  const allEvents = await getAllEvents();
  const allPriorIds = new Set<string>();

  for (const event of events) {
    for (const prior of findPriorRuns(event, allEvents)) {
      allPriorIds.add(prior.id);
    }
  }

  const artworkEventIds = await getUploadedAssetEventIds([...allPriorIds]);
  const map = new Map<string, EventHistoryContext>();

  for (const event of events) {
    map.set(
      event.id,
      buildEventHistoryContext(event, allEvents, artworkEventIds),
    );
  }

  return map;
}

export async function getEventMemory(input: BuildEventMemoryInput): Promise<EventMemory> {
  return buildEventMemory(input);
}
