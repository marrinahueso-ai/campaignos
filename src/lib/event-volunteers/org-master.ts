import "server-only";

import { filterEventsByAccess, getEffectiveAccess } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { parsePlanningQuickLinks } from "@/lib/event-playbooks/planning-constants";
import {
  getOrganizationSchoolYearIds,
  resolveScopedOrganizationId,
} from "@/lib/events/org-scope";
import { mapAssignmentRow, mapSourceRow } from "@/lib/event-volunteers/mappers";
import {
  buildVolunteersMasterKpis,
  calendarWeekRange,
  computeEventFillStats,
  emptyVolunteersMasterPageData,
  listUnderfilledRoles,
  pickTopRoles,
  VOLUNTEERS_MASTER_THIS_WEEK_RAIL_LIMIT,
  VOLUNTEERS_MASTER_UPCOMING_WINDOW_DAYS,
  type VolunteersMasterEventRow,
  type VolunteersMasterPageData,
  type VolunteersMasterUnderfilledRole,
} from "@/lib/event-volunteers/org-master-shared";
import type {
  VolunteerAssignmentView,
  VolunteerSourceRecord,
} from "@/lib/event-volunteers/types";
import { createClient } from "@/lib/supabase/server";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { EventType } from "@/types/playbooks";

export type {
  VolunteersMasterEventRow,
  VolunteersMasterFilter,
  VolunteersMasterKpis,
  VolunteersMasterPageData,
  VolunteersMasterTopRole,
  VolunteersMasterUnderfilledRole,
} from "@/lib/event-volunteers/org-master-shared";

export {
  buildVolunteersMasterKpis,
  calendarWeekRange,
  computeEventFillStats,
  eventMatchesVolunteersSearch,
  filterVolunteersMasterEvents,
  listUnderfilledRoles,
  pickTopRoles,
} from "@/lib/event-volunteers/org-master-shared";

type CandidateEvent = {
  id: string;
  title: string;
  date: string;
  eventType: EventType | null;
  category: string | null;
  planningVolunteerSignupUrl: string | null;
};

const ACTIVE_SOURCE_STATUSES = ["pending_review", "connected", "error"] as const;

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return isMissingSchemaError(error) || error.code === "42P01";
}

function volunteerSignupUrlFromPlanning(raw: unknown): string | null {
  const links = parsePlanningQuickLinks(raw);
  const url = links.volunteer_signup?.url?.trim() ?? "";
  return url.length > 0 ? url : null;
}

function buildEventRow(input: {
  event: CandidateEvent;
  source: VolunteerSourceRecord | null;
  assignments: VolunteerAssignmentView[];
  hasSnapshot: boolean;
  today: string;
  upcomingEnd: string;
}): VolunteersMasterEventRow {
  const fill = computeEventFillStats(input.assignments);
  const underfilled = listUnderfilledRoles(input.assignments);
  const signupUrl =
    input.source?.sourceUrl?.trim() ||
    input.event.planningVolunteerSignupUrl ||
    null;
  const needsPeople = underfilled.length > 0;
  const isCovered =
    input.hasSnapshot &&
    fill.fillRatePercent !== null &&
    fill.fillRatePercent >= 100 &&
    underfilled.length === 0;

  return {
    id: input.event.id,
    title: input.event.title,
    date: input.event.date,
    eventType: input.event.eventType,
    category: input.event.category,
    fillRatePercent: fill.fillRatePercent,
    filledSpots: fill.filledSpots,
    totalSpots: fill.totalSpots,
    openSpots: fill.openSpots,
    underfilledRoleCount: underfilled.length,
    topRoles: pickTopRoles(input.assignments),
    roleNames: [
      ...new Set(input.assignments.map((row) => row.name).filter(Boolean)),
    ],
    signupUrl,
    hasSnapshot: input.hasSnapshot,
    isUpcoming60:
      input.event.date >= input.today && input.event.date <= input.upcomingEnd,
    needsPeople,
    isCovered,
  };
}

/**
 * Org Volunteer Master feed: events with an active SignUpGenius source
 * and/or a non-empty planning `volunteer_signup` URL. Aggregate stats only.
 */
export async function getVolunteersMasterPageData(
  organizationId?: string | null,
): Promise<VolunteersMasterPageData> {
  const empty = emptyVolunteersMasterPageData();

  try {
    const scopedOrgId =
      (await resolveScopedOrganizationId(organizationId)) ??
      (await getCurrentOrganization())?.id ??
      null;
    if (!scopedOrgId) {
      return empty;
    }

    const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
    if (!schoolYearIds.length) {
      return empty;
    }

    const supabase = await createClient();
    const today = getTodayDateString();
    const upcomingEnd = addDaysToDateOnly(
      today,
      VOLUNTEERS_MASTER_UPCOMING_WINDOW_DAYS,
    );
    const week = calendarWeekRange(today);

    const { data: eventRows, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, title, date, event_type, category, planning_quick_links, status, school_year_id",
      )
      .neq("status", "archived")
      .in("school_year_id", schoolYearIds)
      .order("date", { ascending: true });

    if (eventsError) {
      if (!isAbsentTable(eventsError)) {
        console.error(
          "Volunteers Master: events load failed",
          eventsError.message,
        );
      }
      return empty;
    }

    const access = await getEffectiveAccess();
    const accessibleIds = new Set(
      filterEventsByAccess(
        access,
        (eventRows ?? []).map((row) => ({ id: String(row.id) })),
      ).map((row) => row.id),
    );

    const candidates: CandidateEvent[] = (eventRows ?? [])
      .filter((row) => accessibleIds.has(String(row.id)))
      .map((row) => ({
        id: String(row.id),
        title: String(row.title ?? "Untitled event"),
        date: String(row.date),
        eventType: (row.event_type as EventType | null) ?? null,
        category: (row.category as string | null) ?? null,
        planningVolunteerSignupUrl: volunteerSignupUrlFromPlanning(
          row.planning_quick_links,
        ),
      }));

    if (candidates.length === 0) {
      return empty;
    }

    const candidateIds = candidates.map((event) => event.id);
    const { data: sourceRows, error: sourcesError } = await supabase
      .from("event_volunteer_sources")
      .select("*")
      .eq("organization_id", scopedOrgId)
      .in("event_id", candidateIds)
      .in("status", [...ACTIVE_SOURCE_STATUSES]);

    if (sourcesError && !isAbsentTable(sourcesError)) {
      console.error(
        "Volunteers Master: sources load failed",
        sourcesError.message,
      );
    }

    const sourceByEventId = new Map<string, VolunteerSourceRecord>();
    for (const row of sourceRows ?? []) {
      const mapped = mapSourceRow(row as Record<string, unknown>);
      sourceByEventId.set(mapped.eventId, mapped);
    }

    const feedEvents = candidates.filter(
      (event) =>
        sourceByEventId.has(event.id) ||
        Boolean(event.planningVolunteerSignupUrl),
    );

    if (feedEvents.length === 0) {
      return empty;
    }

    const snapshotIds = [
      ...new Set(
        feedEvents
          .map((event) => sourceByEventId.get(event.id)?.latestConfirmedSnapshotId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const assignmentsBySnapshotId = new Map<string, VolunteerAssignmentView[]>();
    const confirmedSnapshotIds = new Set<string>();

    if (snapshotIds.length > 0) {
      const { data: snapshots, error: snapshotsError } = await supabase
        .from("event_volunteer_snapshots")
        .select("id, confirmed")
        .in("id", snapshotIds)
        .eq("organization_id", scopedOrgId);

      if (snapshotsError && !isAbsentTable(snapshotsError)) {
        console.error(
          "Volunteers Master: snapshots load failed",
          snapshotsError.message,
        );
      }

      for (const row of snapshots ?? []) {
        if (row.confirmed) {
          confirmedSnapshotIds.add(String(row.id));
        }
      }

      const confirmedIds = [...confirmedSnapshotIds];
      if (confirmedIds.length > 0) {
        const { data: assignmentRows, error: assignmentsError } = await supabase
          .from("event_volunteer_assignments")
          .select("*")
          .in("snapshot_id", confirmedIds)
          .order("source_order", { ascending: true });

        if (assignmentsError && !isAbsentTable(assignmentsError)) {
          console.error(
            "Volunteers Master: assignments load failed",
            assignmentsError.message,
          );
        }

        for (const row of assignmentRows ?? []) {
          const snapshotId = String(
            (row as Record<string, unknown>).snapshot_id ?? "",
          );
          if (!snapshotId) continue;
          const list = assignmentsBySnapshotId.get(snapshotId) ?? [];
          list.push(mapAssignmentRow(row as Record<string, unknown>));
          assignmentsBySnapshotId.set(snapshotId, list);
        }
      }
    }

    const events: VolunteersMasterEventRow[] = feedEvents.map((event) => {
      const source = sourceByEventId.get(event.id) ?? null;
      const snapshotId = source?.latestConfirmedSnapshotId ?? null;
      const hasSnapshot = Boolean(
        snapshotId && confirmedSnapshotIds.has(snapshotId),
      );
      const assignments =
        snapshotId && hasSnapshot
          ? (assignmentsBySnapshotId.get(snapshotId) ?? [])
          : [];

      return buildEventRow({
        event,
        source,
        assignments,
        hasSnapshot,
        today,
        upcomingEnd,
      });
    });

    const kpis = buildVolunteersMasterKpis(events);

    let lastSuccessfulSyncAt: string | null = null;
    for (const event of feedEvents) {
      const syncAt = sourceByEventId.get(event.id)?.lastSuccessfulSyncAt ?? null;
      if (!syncAt) continue;
      if (!lastSuccessfulSyncAt || syncAt > lastSuccessfulSyncAt) {
        lastSuccessfulSyncAt = syncAt;
      }
    }

    const thisWeekUnderfilled: VolunteersMasterUnderfilledRole[] = [];
    for (const event of events) {
      if (event.date < week.start || event.date > week.end) continue;
      const source = sourceByEventId.get(event.id);
      const snapshotId = source?.latestConfirmedSnapshotId;
      if (!snapshotId || !confirmedSnapshotIds.has(snapshotId)) continue;
      const assignments = assignmentsBySnapshotId.get(snapshotId) ?? [];
      for (const role of listUnderfilledRoles(assignments)) {
        thisWeekUnderfilled.push({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          roleName: role.roleName,
          openSpots: role.openSpots,
        });
      }
    }
    thisWeekUnderfilled.sort((a, b) => b.openSpots - a.openSpots);

    return {
      events,
      kpis,
      thisWeekUnderfilled: thisWeekUnderfilled.slice(
        0,
        VOLUNTEERS_MASTER_THIS_WEEK_RAIL_LIMIT,
      ),
      lastSuccessfulSyncAt,
    };
  } catch (error) {
    console.error("Volunteers Master: page data failed", error);
    return empty;
  }
}
