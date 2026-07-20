import "server-only";

import { buildSnapshotFromAssignments } from "@/lib/event-volunteers/stats";
import type {
  VolunteerSignupSnapshot,
  VolunteerStatsSummary,
} from "@/lib/event-volunteers/types";
import { createClient } from "@/lib/supabase/server";

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

export async function writeVolunteerActivityLog(input: {
  organizationId: string;
  eventId: string;
  sourceId?: string | null;
  actorUserId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("event_volunteer_activity_logs").insert({
    organization_id: input.organizationId,
    event_id: input.eventId,
    source_id: input.sourceId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    details: input.details ?? {},
  });
}

export async function upsertVolunteerSource(input: {
  eventId: string;
  organizationId: string;
  sourceUrl: string;
  sourceUrlNormalized: string;
  userId: string;
  status?: "pending_review" | "connected" | "error";
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_volunteer_sources")
    .select("id, status")
    .eq("event_id", input.eventId)
    .eq("organization_id", input.organizationId)
    .in("status", ["pending_review", "connected", "error"])
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("event_volunteer_sources")
      .update({
        source_url: input.sourceUrl,
        source_url_normalized: input.sourceUrlNormalized,
        status: input.status ?? "pending_review",
        connected_by_user_id: input.userId,
        connected_at: now,
        disconnected_at: null,
        sync_error: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error || !data) {
      return { error: "Could not update the volunteer source." };
    }
    return { id: String(data.id) };
  }

  const { data, error } = await supabase
    .from("event_volunteer_sources")
    .insert({
      event_id: input.eventId,
      organization_id: input.organizationId,
      provider: "signupgenius",
      source_url: input.sourceUrl,
      source_url_normalized: input.sourceUrlNormalized,
      status: input.status ?? "pending_review",
      connected_by_user_id: input.userId,
      connected_at: now,
      sync_status: "idle",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not connect the volunteer source." };
  }
  return { id: String(data.id) };
}

export async function beginVolunteerSync(
  sourceId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("event_volunteer_sources")
    .select("sync_status")
    .eq("id", sourceId)
    .maybeSingle();

  if (current?.sync_status === "syncing") {
    return { error: "A refresh is already in progress for this signup." };
  }

  const { error } = await supabase
    .from("event_volunteer_sources")
    .update({
      sync_status: "syncing",
      last_sync_attempt_at: new Date().toISOString(),
      sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (error) {
    return { error: "Could not start refresh." };
  }
  return { ok: true };
}

export async function persistVolunteerSnapshot(input: {
  eventId: string;
  organizationId: string;
  sourceId: string;
  snapshot: VolunteerSignupSnapshot;
  summary: VolunteerStatsSummary;
  confirmed: boolean;
  eventDate?: string | null;
}): Promise<{ snapshotId: string } | { error: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Never replace a confirmed snapshot with an empty parse.
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
      confirmed: input.confirmed,
      captured_at: now,
      parse_version: input.snapshot.parseVersion,
    })
    .select("id")
    .single();

  if (snapshotError || !snapshotRow) {
    return { error: "Could not save volunteer snapshot." };
  }

  const snapshotId = String(snapshotRow.id);
  const assignmentRows = input.snapshot.assignments.map((assignment, index) => ({
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
    availability_status:
      "availabilityStatus" in assignment && assignment.availabilityStatus
        ? assignment.availabilityStatus
        : "unknown",
    source_order:
      "sourceOrder" in assignment && typeof assignment.sourceOrder === "number"
        ? assignment.sourceOrder
        : index,
  }));

  // Ensure status fields exist via rebuild
  const rebuilt = buildSnapshotFromAssignments({
    ...input.snapshot,
    assignments: input.snapshot.assignments,
  });
  const rows = rebuilt.classified.map((assignment) => ({
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

  void assignmentRows;

  const { error: assignmentError } = await supabase
    .from("event_volunteer_assignments")
    .insert(rows);

  if (assignmentError) {
    await supabase.from("event_volunteer_snapshots").delete().eq("id", snapshotId);
    return { error: "Could not save volunteer assignments." };
  }

  const sourceUpdate: Record<string, unknown> = {
    sync_status: "success",
    last_successful_sync_at: now,
    sync_error: null,
    next_scheduled_sync_at: nextScheduledSyncAt(input.eventDate),
    updated_at: now,
  };

  if (input.confirmed) {
    sourceUpdate.status = "connected";
    sourceUpdate.latest_confirmed_snapshot_id = snapshotId;
  }

  await supabase
    .from("event_volunteer_sources")
    .update(sourceUpdate)
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

export async function markVolunteerSyncFailed(input: {
  sourceId: string;
  eventId: string;
  organizationId: string;
  errorMessage: string;
}) {
  const supabase = await createClient();
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

export async function confirmVolunteerSnapshot(input: {
  sourceId: string;
  snapshotId: string;
  organizationId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: snapError } = await supabase
    .from("event_volunteer_snapshots")
    .update({ confirmed: true })
    .eq("id", input.snapshotId)
    .eq("organization_id", input.organizationId)
    .eq("source_id", input.sourceId);

  if (snapError) {
    return { error: "Could not confirm volunteer overview." };
  }

  const { error } = await supabase
    .from("event_volunteer_sources")
    .update({
      status: "connected",
      latest_confirmed_snapshot_id: input.snapshotId,
      updated_at: now,
    })
    .eq("id", input.sourceId)
    .eq("organization_id", input.organizationId);

  if (error) {
    return { error: "Could not confirm volunteer overview." };
  }
  return { ok: true };
}

export async function disconnectVolunteerSource(input: {
  sourceId: string;
  organizationId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("event_volunteer_sources")
    .update({
      status: "disconnected",
      disconnected_at: now,
      sync_status: "idle",
      next_scheduled_sync_at: null,
      updated_at: now,
    })
    .eq("id", input.sourceId)
    .eq("organization_id", input.organizationId);

  if (error) {
    return { error: "Could not disconnect the signup link." };
  }
  return { ok: true };
}
