import type {
  VolunteerAssignmentView,
  VolunteerAvailabilityStatus,
  VolunteerSnapshotRecord,
  VolunteerSourceRecord,
  VolunteerStatsSummary,
  VolunteerSyncAttemptRecord,
} from "@/lib/event-volunteers/types";

export function mapSourceRow(row: Record<string, unknown>): VolunteerSourceRecord {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    organizationId: String(row.organization_id),
    provider: "signupgenius",
    sourceUrl: String(row.source_url),
    status: row.status as VolunteerSourceRecord["status"],
    syncStatus: row.sync_status as VolunteerSourceRecord["syncStatus"],
    syncError: (row.sync_error as string | null) ?? null,
    connectedAt: (row.connected_at as string | null) ?? null,
    lastSyncAttemptAt: (row.last_sync_attempt_at as string | null) ?? null,
    lastSuccessfulSyncAt: (row.last_successful_sync_at as string | null) ?? null,
    lastFailedSyncAt: (row.last_failed_sync_at as string | null) ?? null,
    nextScheduledSyncAt: (row.next_scheduled_sync_at as string | null) ?? null,
    latestConfirmedSnapshotId:
      (row.latest_confirmed_snapshot_id as string | null) ?? null,
  };
}

export function mapAssignmentRow(
  row: Record<string, unknown>,
): VolunteerAssignmentView {
  return {
    externalKey: String(row.external_key),
    groupName: (row.group_name as string | null) ?? undefined,
    name: String(row.assignment_name),
    description: (row.assignment_description as string | null) ?? undefined,
    date: (row.assignment_date as string | null) ?? undefined,
    startTime: (row.start_time as string | null) ?? undefined,
    endTime: (row.end_time as string | null) ?? undefined,
    location: (row.location as string | null) ?? undefined,
    quantityRequested: (row.quantity_requested as number | null) ?? null,
    quantityFilled: (row.quantity_filled as number | null) ?? null,
    quantityOpen: (row.quantity_open as number | null) ?? null,
    availabilityStatus: row.availability_status as VolunteerAvailabilityStatus,
    sourceOrder: Number(row.source_order ?? 0),
  };
}

export function mapSnapshotRow(
  row: Record<string, unknown>,
  assignments: VolunteerAssignmentView[],
): VolunteerSnapshotRecord {
  const summary: VolunteerStatsSummary = {
    totalSpots: (row.total_spots as number | null) ?? null,
    filledSpots: (row.filled_spots as number | null) ?? null,
    openSpots: (row.open_spots as number | null) ?? null,
    overallFilledPercent:
      row.total_spots &&
      typeof row.total_spots === "number" &&
      row.total_spots > 0 &&
      typeof row.filled_spots === "number"
        ? Math.round((row.filled_spots / row.total_spots) * 100)
        : null,
    fullAssignmentCount: Number(row.full_assignment_count ?? 0),
    needsHelpCount: Number(row.needs_help_count ?? 0),
    nearlyFullCount: Number(row.nearly_full_count ?? 0),
    unknownAssignmentCount: Number(row.unknown_assignment_count ?? 0),
    assignmentCount: Number(row.assignment_count ?? assignments.length),
    quantitiesComplete: Boolean(row.quantities_complete),
  };

  return {
    id: String(row.id),
    eventId: String(row.event_id),
    sourceId: String(row.source_id),
    capturedAt: String(row.captured_at),
    confirmed: Boolean(row.confirmed),
    sourceTitle: (row.source_title as string | null) ?? null,
    sourceDescription: (row.source_description as string | null) ?? null,
    sourceLocation: (row.source_location as string | null) ?? null,
    signupDeadline: (row.signup_deadline as string | null) ?? null,
    summary,
    assignments,
  };
}

export function mapSyncAttemptRow(
  row: Record<string, unknown>,
): VolunteerSyncAttemptRecord {
  return {
    id: String(row.id),
    status: row.status as VolunteerSyncAttemptRecord["status"],
    errorMessage: (row.error_message as string | null) ?? null,
    assignmentCount: (row.assignment_count as number | null) ?? null,
    startedAt: String(row.started_at),
    finishedAt: String(row.finished_at),
  };
}
