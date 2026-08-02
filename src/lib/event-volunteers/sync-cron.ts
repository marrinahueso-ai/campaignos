import "server-only";

import {
  filterAssignmentsByDateAllowlist,
  type AssignmentDateAllowlist,
} from "@/lib/event-volunteers/assignment-list";
import { mapSourceRow } from "@/lib/event-volunteers/mappers";
import { filterParticipantsByDateAllowlist } from "@/lib/event-volunteers/participant-list";
import { buildSnapshotFromAssignments } from "@/lib/event-volunteers/stats";
import { readSignUpGeniusSignup } from "@/lib/event-volunteers/signupgenius-reader";
import type { VolunteerSignupParticipant } from "@/lib/event-volunteers/types";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/** Match interactive refresh spacing — never scrape more often per source. */
const STALE_MS = 30 * 60 * 1000;

/** Bound SignUpGenius fetches per cron tick. */
export const MAX_VOLUNTEER_SOURCES_PER_CRON_RUN = 10;

export type VolunteerSyncCronResult = {
  candidateCount: number;
  processedCount: number;
  syncedCount: number;
  failedCount: number;
  errors: string[];
};

type StaleVolunteerSource = {
  id: string;
  eventId: string;
  organizationId: string;
  sourceUrl: string;
  includedAssignmentDates: AssignmentDateAllowlist;
  eventDate: string | null;
};

function nextScheduledSyncAt(eventDate: string | null | undefined): string | null {
  if (!eventDate) {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  const endOfEvent = new Date(`${eventDate}T23:59:59`);
  if (Number.isNaN(endOfEvent.getTime()) || endOfEvent.getTime() < Date.now()) {
    return null;
  }
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

async function findStaleConnectedVolunteerSources(): Promise<StaleVolunteerSource[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "Volunteer sync cron: SUPABASE_SERVICE_ROLE_KEY is not configured; cannot load sources under RLS.",
    );
    return [];
  }

  const supabase = createAdminClient();
  const staleBeforeMs = Date.now() - STALE_MS;

  const { data, error } = await supabase
    .from("event_volunteer_sources")
    .select(
      "id, event_id, organization_id, source_url, included_assignment_dates, last_successful_sync_at, sync_status, events(date)",
    )
    .eq("status", "connected")
    .neq("sync_status", "syncing")
    .order("last_successful_sync_at", { ascending: true, nullsFirst: true })
    .limit(MAX_VOLUNTEER_SOURCES_PER_CRON_RUN + 50);

  if (error) {
    console.error("Volunteer sync cron: failed to load stale sources:", error.message);
    return [];
  }

  const staleRows = (data ?? []).filter((row) => {
    const lastSuccess = row.last_successful_sync_at as string | null;
    if (!lastSuccess) {
      return true;
    }
    const lastMs = new Date(lastSuccess).getTime();
    return Number.isFinite(lastMs) && lastMs < staleBeforeMs;
  });

  return staleRows.slice(0, MAX_VOLUNTEER_SOURCES_PER_CRON_RUN).map((row) => {
    const mapped = mapSourceRow(row as Record<string, unknown>);
    const eventJoin = row.events as { date?: string | null } | null | undefined;
    return {
      id: mapped.id,
      eventId: mapped.eventId,
      organizationId: mapped.organizationId,
      sourceUrl: mapped.sourceUrl,
      includedAssignmentDates: mapped.includedAssignmentDates,
      eventDate: eventJoin?.date ?? null,
    };
  });
}

async function syncVolunteerSourceForCron(
  source: StaleVolunteerSource,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from("event_volunteer_sources")
    .select("sync_status")
    .eq("id", source.id)
    .maybeSingle();

  if (current?.sync_status === "syncing") {
    return { ok: false, error: "Refresh already in progress." };
  }

  const { error: beginError } = await supabase
    .from("event_volunteer_sources")
    .update({
      sync_status: "syncing",
      last_sync_attempt_at: now,
      sync_error: null,
      updated_at: now,
    })
    .eq("id", source.id);

  if (beginError) {
    return { ok: false, error: "Could not start refresh." };
  }

  const read = await readSignUpGeniusSignup(source.sourceUrl);
  if (!read.ok) {
    await markVolunteerSyncFailedAdmin({
      sourceId: source.id,
      eventId: source.eventId,
      organizationId: source.organizationId,
      errorMessage: read.error,
    });
    return { ok: false, error: read.error };
  }

  if (read.snapshot.assignments.length === 0) {
    const message = "No assignments found.";
    await markVolunteerSyncFailedAdmin({
      sourceId: source.id,
      eventId: source.eventId,
      organizationId: source.organizationId,
      errorMessage: message,
    });
    return { ok: false, error: message };
  }

  const scopedAssignments = filterAssignmentsByDateAllowlist(
    read.snapshot.assignments,
    source.includedAssignmentDates,
  );

  if (scopedAssignments.length === 0) {
    const message = "No assignments found for the dates included in this event.";
    await markVolunteerSyncFailedAdmin({
      sourceId: source.id,
      eventId: source.eventId,
      organizationId: source.organizationId,
      errorMessage: message,
    });
    return { ok: false, error: message };
  }

  const scopedParticipants = filterParticipantsByDateAllowlist(
    read.snapshot.participants ?? [],
    source.includedAssignmentDates,
  );

  const rebuilt = buildSnapshotFromAssignments({
    ...read.snapshot,
    assignments: scopedAssignments,
    participants: scopedParticipants,
  });

  const persisted = await persistVolunteerSnapshotAdmin({
    eventId: source.eventId,
    organizationId: source.organizationId,
    sourceId: source.id,
    snapshot: rebuilt.snapshot,
    summary: rebuilt.summary,
    eventDate: source.eventDate,
  });

  if ("error" in persisted) {
    await markVolunteerSyncFailedAdmin({
      sourceId: source.id,
      eventId: source.eventId,
      organizationId: source.organizationId,
      errorMessage: persisted.error,
    });
    return { ok: false, error: persisted.error };
  }

  return { ok: true };
}

async function markVolunteerSyncFailedAdmin(input: {
  sourceId: string;
  eventId: string;
  organizationId: string;
  errorMessage: string;
}) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("event_volunteer_sources")
    .update({
      sync_status: "error",
      last_failed_sync_at: now,
      sync_error: input.errorMessage,
      updated_at: now,
    })
    .eq("id", input.sourceId);

  await supabase.from("event_volunteer_sync_attempts").insert({
    source_id: input.sourceId,
    event_id: input.eventId,
    organization_id: input.organizationId,
    status: "error",
    error_message: input.errorMessage,
    started_at: now,
    finished_at: now,
  });
}

async function persistVolunteerSnapshotAdmin(input: {
  eventId: string;
  organizationId: string;
  sourceId: string;
  snapshot: ReturnType<typeof buildSnapshotFromAssignments>["snapshot"];
  summary: ReturnType<typeof buildSnapshotFromAssignments>["summary"];
  eventDate: string | null;
}): Promise<{ snapshotId: string } | { error: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (input.snapshot.assignments.length === 0) {
    return { error: "No assignments found." };
  }

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("event_volunteer_snapshots")
    .insert({
      event_id: input.eventId,
      organization_id: input.organizationId,
      source_id: input.sourceId,
      total_spots: input.summary.totalSpots,
      filled_spots: input.summary.filledSpots,
      open_spots: input.summary.openSpots,
      full_assignment_count: input.summary.fullAssignmentCount,
      needs_help_count: input.summary.needsHelpCount,
      nearly_full_count: input.summary.nearlyFullCount,
      unknown_assignment_count: input.summary.unknownAssignmentCount,
      assignment_count: input.summary.assignmentCount,
      source_title: input.snapshot.sourceTitle ?? null,
      source_description: input.snapshot.sourceDescription ?? null,
      source_location: input.snapshot.sourceLocation ?? null,
      signup_deadline: input.snapshot.signupDeadline || null,
      quantities_complete: input.summary.quantitiesComplete,
      confirmed: true,
      captured_at: now,
      parse_version: input.snapshot.parseVersion,
    })
    .select("id")
    .single();

  if (snapshotError || !snapshotRow) {
    return { error: "Could not save volunteer snapshot." };
  }

  const snapshotId = String(snapshotRow.id);
  const rows = buildSnapshotFromAssignments({
    ...input.snapshot,
    assignments: input.snapshot.assignments,
  }).classified.map((assignment) => ({
    snapshot_id: snapshotId,
    event_id: input.eventId,
    organization_id: input.organizationId,
    external_key: assignment.externalKey,
    group_name: assignment.groupName ?? null,
    assignment_name: assignment.name,
    assignment_description: assignment.description ?? null,
    assignment_date: assignment.date ?? null,
    start_time: assignment.startTime ?? null,
    end_time: assignment.endTime ?? null,
    location: assignment.location ?? null,
    quantity_requested: assignment.quantityRequested,
    quantity_filled: assignment.quantityFilled,
    quantity_open: assignment.quantityOpen,
    availability_status: assignment.availabilityStatus,
    source_order: assignment.sourceOrder,
  }));

  const { error: assignmentError } = await supabase
    .from("event_volunteer_assignments")
    .insert(rows);

  if (assignmentError) {
    await supabase.from("event_volunteer_snapshots").delete().eq("id", snapshotId);
    return { error: "Could not save volunteer assignments." };
  }

  const participants: VolunteerSignupParticipant[] =
    input.snapshot.participants ?? [];
  if (participants.length > 0) {
    const participantRows = participants.map((participant, index) => ({
      snapshot_id: snapshotId,
      event_id: input.eventId,
      organization_id: input.organizationId,
      assignment_external_key: participant.assignmentExternalKey,
      participant_key: participant.participantKey,
      volunteer_name: participant.name,
      role_name: participant.roleName,
      assignment_date: participant.date ?? null,
      start_time: participant.startTime ?? null,
      end_time: participant.endTime ?? null,
      location: participant.location ?? null,
      status: participant.status,
      source_order: index,
    }));
    const { error: participantError } = await supabase
      .from("event_volunteer_participants")
      .insert(participantRows);
    if (participantError) {
      await supabase.from("event_volunteer_snapshots").delete().eq("id", snapshotId);
      return { error: "Could not save volunteer roster." };
    }
  }

  await supabase
    .from("event_volunteer_sources")
    .update({
      status: "connected",
      sync_status: "success",
      last_successful_sync_at: now,
      sync_error: null,
      latest_confirmed_snapshot_id: snapshotId,
      next_scheduled_sync_at: nextScheduledSyncAt(input.eventDate),
      updated_at: now,
    })
    .eq("id", input.sourceId);

  await supabase.from("event_volunteer_sync_attempts").insert({
    source_id: input.sourceId,
    event_id: input.eventId,
    organization_id: input.organizationId,
    status: input.summary.quantitiesComplete ? "success" : "partial",
    snapshot_id: snapshotId,
    assignment_count: input.summary.assignmentCount,
    started_at: now,
    finished_at: now,
  });

  return { snapshotId };
}

export async function syncStaleVolunteerSourcesForCron(): Promise<VolunteerSyncCronResult> {
  const candidates = await findStaleConnectedVolunteerSources();
  const result: VolunteerSyncCronResult = {
    candidateCount: candidates.length,
    processedCount: 0,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const source of candidates) {
    result.processedCount += 1;
    const syncResult = await syncVolunteerSourceForCron(source);
    if (syncResult.ok) {
      result.syncedCount += 1;
    } else {
      result.failedCount += 1;
      result.errors.push(`Source ${source.id}: ${syncResult.error}`);
    }
  }

  return result;
}
