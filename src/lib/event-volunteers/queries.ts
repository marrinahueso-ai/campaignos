import "server-only";

import {
  mapAssignmentRow,
  mapParticipantRow,
  mapSnapshotRow,
  mapSourceRow,
  mapSyncAttemptRow,
} from "@/lib/event-volunteers/mappers";
import type {
  VolunteerSnapshotRecord,
  VolunteerSourceRecord,
  VolunteerSyncAttemptRecord,
} from "@/lib/event-volunteers/types";
import { createClient } from "@/lib/supabase/server";

export async function getActiveVolunteerSourceForEvent(
  eventId: string,
  organizationId: string,
): Promise<VolunteerSourceRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_sources")
    .select("*")
    .eq("event_id", eventId)
    .eq("organization_id", organizationId)
    .in("status", ["pending_review", "connected", "error"])
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapSourceRow(data as Record<string, unknown>);
}

export async function getVolunteerSnapshotById(
  snapshotId: string,
  organizationId: string,
): Promise<VolunteerSnapshotRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [{ data: assignmentRows }, { data: participantRows }] =
    await Promise.all([
      supabase
        .from("event_volunteer_assignments")
        .select("*")
        .eq("snapshot_id", snapshotId)
        .eq("organization_id", organizationId)
        .order("source_order", { ascending: true }),
      supabase
        .from("event_volunteer_participants")
        .select("*")
        .eq("snapshot_id", snapshotId)
        .eq("organization_id", organizationId)
        .order("source_order", { ascending: true }),
    ]);

  const assignments = (assignmentRows ?? []).map((row) =>
    mapAssignmentRow(row as Record<string, unknown>),
  );
  const participants = (participantRows ?? []).map((row) =>
    mapParticipantRow(row as Record<string, unknown>),
  );

  return mapSnapshotRow(
    data as Record<string, unknown>,
    assignments,
    participants,
  );
}

export async function getLatestConfirmedVolunteerSnapshot(
  eventId: string,
  organizationId: string,
): Promise<VolunteerSnapshotRecord | null> {
  const source = await getActiveVolunteerSourceForEvent(eventId, organizationId);
  if (source?.latestConfirmedSnapshotId) {
    const byId = await getVolunteerSnapshotById(
      source.latestConfirmedSnapshotId,
      organizationId,
    );
    if (byId) return byId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_snapshots")
    .select("*")
    .eq("event_id", eventId)
    .eq("organization_id", organizationId)
    .eq("confirmed", true)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return getVolunteerSnapshotById(String(data.id), organizationId);
}

export type VolunteerStaffingCounts = {
  filledSpots: number;
  totalSpots: number | null;
  openSpots: number | null;
};

/**
 * Lightweight staffing counts for event hero / landing stats.
 * Same snapshot preference as getLatestConfirmedVolunteerSnapshot, without
 * loading assignments.
 */
export async function getLatestConfirmedVolunteerStaffingCounts(
  eventId: string,
): Promise<VolunteerStaffingCounts> {
  const empty: VolunteerStaffingCounts = {
    filledSpots: 0,
    totalSpots: null,
    openSpots: null,
  };
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("event_volunteer_sources")
    .select("latest_confirmed_snapshot_id")
    .eq("event_id", eventId)
    .in("status", ["pending_review", "connected", "error"])
    .maybeSingle();

  const snapshotId =
    source && typeof source.latest_confirmed_snapshot_id === "string"
      ? source.latest_confirmed_snapshot_id
      : null;

  const selectCols = "filled_spots, total_spots, open_spots";

  let row: {
    filled_spots: unknown;
    total_spots: unknown;
    open_spots: unknown;
  } | null = null;

  if (snapshotId) {
    const { data, error } = await supabase
      .from("event_volunteer_snapshots")
      .select(selectCols)
      .eq("id", snapshotId)
      .maybeSingle();
    if (!error && data) row = data;
  }

  if (!row) {
    const { data, error } = await supabase
      .from("event_volunteer_snapshots")
      .select(selectCols)
      .eq("event_id", eventId)
      .eq("confirmed", true)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return empty;
    row = data;
  }

  const filled =
    typeof row.filled_spots === "number" && Number.isFinite(row.filled_spots)
      ? row.filled_spots
      : 0;
  const total =
    typeof row.total_spots === "number" && Number.isFinite(row.total_spots)
      ? row.total_spots
      : null;
  const open =
    typeof row.open_spots === "number" && Number.isFinite(row.open_spots)
      ? row.open_spots
      : null;

  return { filledSpots: filled, totalSpots: total, openSpots: open };
}

/** @deprecated Prefer getLatestConfirmedVolunteerStaffingCounts for new callers. */
export async function getLatestConfirmedVolunteerFilledSpots(
  eventId: string,
): Promise<number> {
  const staffing = await getLatestConfirmedVolunteerStaffingCounts(eventId);
  return staffing.filledSpots;
}

export async function getPendingVolunteerSnapshot(
  sourceId: string,
  organizationId: string,
): Promise<VolunteerSnapshotRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_snapshots")
    .select("*")
    .eq("source_id", sourceId)
    .eq("organization_id", organizationId)
    .eq("confirmed", false)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return getVolunteerSnapshotById(String(data.id), organizationId);
}

export async function listVolunteerSyncAttempts(
  sourceId: string,
  organizationId: string,
  limit = 10,
): Promise<VolunteerSyncAttemptRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_sync_attempts")
    .select("*")
    .eq("source_id", sourceId)
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapSyncAttemptRow(row as Record<string, unknown>));
}

export async function getPreviousConfirmedSnapshotSummary(
  eventId: string,
  organizationId: string,
  currentSnapshotId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_volunteer_snapshots")
    .select(
      "id, total_spots, filled_spots, open_spots, full_assignment_count, needs_help_count, nearly_full_count, unknown_assignment_count, assignment_count, quantities_complete",
    )
    .eq("event_id", eventId)
    .eq("organization_id", organizationId)
    .eq("confirmed", true)
    .neq("id", currentSnapshotId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    totalSpots: (data.total_spots as number | null) ?? null,
    filledSpots: (data.filled_spots as number | null) ?? null,
    openSpots: (data.open_spots as number | null) ?? null,
    overallFilledPercent: null,
    fullAssignmentCount: Number(data.full_assignment_count ?? 0),
    needsHelpCount: Number(data.needs_help_count ?? 0),
    nearlyFullCount: Number(data.nearly_full_count ?? 0),
    unknownAssignmentCount: Number(data.unknown_assignment_count ?? 0),
    assignmentCount: Number(data.assignment_count ?? 0),
    quantitiesComplete: Boolean(data.quantities_complete),
  };
}
