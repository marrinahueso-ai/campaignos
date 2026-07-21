import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import {
  getActiveVolunteerSourceForEvent,
  getLatestConfirmedVolunteerSnapshot,
} from "@/lib/event-volunteers/queries";
import { availabilityStatusLabel } from "@/lib/event-volunteers/stats";
import { listCommitteeAssignmentsByOrg } from "@/lib/organization-workspace/roster-assignments";
import { createClient } from "@/lib/supabase/server";
import {
  emptyOrgVolunteersSection,
  emptyVolunteersSection,
  type OrgVolunteersContextSection,
  type OrgVolunteersEventSummary,
  type VolunteerCommitteeStatus,
  type VolunteerShiftNeed,
  type VolunteersContextSection,
} from "@/lib/ralli-assistant/volunteers-format";

export type {
  OrgVolunteersContextSection,
  OrgVolunteersEventSummary,
  VolunteerCommitteeStatus,
  VolunteerShiftNeed,
  VolunteersContextSection,
} from "@/lib/ralli-assistant/volunteers-format";
export {
  emptyOrgVolunteersSection,
  emptyVolunteersSection,
  formatOrgVolunteersSectionLines,
  formatVolunteersSectionLines,
  serializeOrgVolunteersForPrompt,
  serializeVolunteersForPrompt,
  volunteersEventLinks,
} from "@/lib/ralli-assistant/volunteers-format";

function isAbsentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return isMissingSchemaError(error) || error.code === "42P01";
}

async function loadEventTiedCommittees(
  organizationId: string,
  eventId: string,
): Promise<{
  tiedCount: number;
  withChairCount: number;
  missingChairNames: string[];
  committeeNames: string[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_committees")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("assigned_event_id", eventId)
    .is("archived_at", null);

  if (error && !isAbsentTable(error)) {
    console.error("Ask Ralli volunteers: committees load failed", error.message);
    return {
      tiedCount: 0,
      withChairCount: 0,
      missingChairNames: [],
      committeeNames: [],
    };
  }

  const committees = data ?? [];
  if (committees.length === 0) {
    return {
      tiedCount: 0,
      withChairCount: 0,
      missingChairNames: [],
      committeeNames: [],
    };
  }

  const assignments = await listCommitteeAssignmentsByOrg(organizationId).catch(
    () => [],
  );
  const chairByCommittee = new Set(
    assignments
      .filter((row) => row.role === "chair")
      .map((row) => row.committeeId),
  );

  const missingChairNames: string[] = [];
  let withChairCount = 0;
  for (const committee of committees) {
    const id = String(committee.id);
    const name = String(committee.name ?? "Committee");
    if (chairByCommittee.has(id)) {
      withChairCount += 1;
    } else {
      missingChairNames.push(name);
    }
  }

  return {
    tiedCount: committees.length,
    withChairCount,
    missingChairNames,
    committeeNames: committees.map((c) => String(c.name ?? "Committee")),
  };
}

function matchOpenSpotsForCommittee(
  committeeName: string,
  shifts: VolunteerShiftNeed[],
): number | null {
  const needle = committeeName.trim().toLowerCase();
  if (!needle) return null;
  let total: number | null = null;
  for (const shift of shifts) {
    const group = (shift.groupName ?? "").toLowerCase();
    const name = shift.name.toLowerCase();
    if (
      (group && (group.includes(needle) || needle.includes(group))) ||
      name.includes(needle)
    ) {
      if (typeof shift.openSpots === "number") {
        total = (total ?? 0) + shift.openSpots;
      }
    }
  }
  return total;
}

/**
 * Event-scoped volunteer pack from SignUpGenius snapshots + committee chairs.
 * Fail soft — empty/unavailable sections when data is missing.
 */
export async function loadVolunteersContextForEvent(input: {
  eventId: string;
  organizationId: string;
}): Promise<VolunteersContextSection> {
  const unavailable = [
    "Individual volunteer response status (who hasn’t responded)",
    "Family / parent view counts for volunteer pages",
  ];

  try {
    const [source, snapshot, committeeInfo] = await Promise.all([
      getActiveVolunteerSourceForEvent(
        input.eventId,
        input.organizationId,
      ).catch(() => null),
      getLatestConfirmedVolunteerSnapshot(
        input.eventId,
        input.organizationId,
      ).catch(() => null),
      loadEventTiedCommittees(input.organizationId, input.eventId),
    ]);

    if (!source) {
      return {
        ...emptyVolunteersSection([
          ...unavailable,
          "SignUpGenius is not connected for this event",
        ]),
        committees: {
          tiedCount: committeeInfo.tiedCount,
          withChairCount: committeeInfo.withChairCount,
          missingChairNames: committeeInfo.missingChairNames,
          behind: [],
        },
      };
    }

    if (!snapshot) {
      return {
        ...emptyVolunteersSection([
          ...unavailable,
          "No confirmed volunteer snapshot yet — sync SignUpGenius on the Volunteers tab",
        ]),
        connected:
          source.status === "connected" || source.status === "pending_review",
        sourceStatus: source.status,
        lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
        committees: {
          tiedCount: committeeInfo.tiedCount,
          withChairCount: committeeInfo.withChairCount,
          missingChairNames: committeeInfo.missingChairNames,
          behind: [],
        },
      };
    }

    const shiftsNeedingHelp: VolunteerShiftNeed[] = snapshot.assignments
      .filter(
        (assignment) =>
          assignment.availabilityStatus === "high_need" ||
          assignment.availabilityStatus === "needs_help" ||
          (typeof assignment.quantityOpen === "number" &&
            assignment.quantityOpen > 0 &&
            assignment.availabilityStatus !== "nearly_full" &&
            assignment.availabilityStatus !== "full"),
      )
      .map((assignment) => ({
        name: assignment.name,
        openSpots: assignment.quantityOpen,
        status: availabilityStatusLabel(assignment.availabilityStatus),
        groupName: assignment.groupName ?? null,
      }))
      .sort((a, b) => (b.openSpots ?? 0) - (a.openSpots ?? 0))
      .slice(0, 8);

    const openSpots = snapshot.summary.openSpots;
    const signupReminderSuggested =
      (typeof openSpots === "number" && openSpots > 0) ||
      snapshot.summary.needsHelpCount > 0;

    const behind: VolunteerCommitteeStatus[] = [];
    for (const name of committeeInfo.committeeNames) {
      const openInGroup = matchOpenSpotsForCommittee(name, shiftsNeedingHelp);
      const hasChair = !committeeInfo.missingChairNames.includes(name);
      let behindReason: string | null = null;
      if (!hasChair) {
        behindReason = "No chair assigned";
      } else if (typeof openInGroup === "number" && openInGroup > 0) {
        behindReason = `${openInGroup} open volunteer spot${openInGroup === 1 ? "" : "s"} in matching shifts`;
      }
      if (behindReason) {
        behind.push({
          name,
          hasChair,
          openSpotsInGroup: openInGroup,
          behindReason,
        });
      }
    }

    return {
      connected: true,
      sourceStatus: source.status,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
      summary: {
        openSpots: snapshot.summary.openSpots,
        filledSpots: snapshot.summary.filledSpots,
        totalSpots: snapshot.summary.totalSpots,
        filledPercent: snapshot.summary.overallFilledPercent,
        needsHelpCount: snapshot.summary.needsHelpCount,
        assignmentCount: snapshot.summary.assignmentCount,
      },
      shiftsNeedingHelp,
      signupReminderSuggested,
      committees: {
        tiedCount: committeeInfo.tiedCount,
        withChairCount: committeeInfo.withChairCount,
        missingChairNames: committeeInfo.missingChairNames,
        behind: behind.slice(0, 6),
      },
      unavailable,
    };
  } catch (error) {
    console.error("Ask Ralli volunteers: event context failed", error);
    return emptyVolunteersSection([
      ...unavailable,
      "Volunteer data could not be loaded just now",
    ]);
  }
}

/**
 * Org-level volunteer aggregate across active events (capped). Fail soft.
 */
export async function loadVolunteersContextForOrg(input: {
  organizationId: string;
  events: Array<{ id: string; title: string }>;
  limit?: number;
}): Promise<OrgVolunteersContextSection> {
  const unavailable = [
    "Individual volunteer response status (who hasn’t responded)",
    "Family / parent view counts for volunteer pages",
  ];
  const limit = input.limit ?? 8;
  const eventsNeedingVolunteers: OrgVolunteersEventSummary[] = [];
  let eventsWithVolunteerData = 0;

  const slice = input.events.slice(0, limit);
  const packs = await Promise.all(
    slice.map(async (event) => {
      const pack = await loadVolunteersContextForEvent({
        eventId: event.id,
        organizationId: input.organizationId,
      });
      return { event, pack };
    }),
  );

  for (const { event, pack } of packs) {
    if (pack.connected && pack.summary) {
      eventsWithVolunteerData += 1;
    }
    const open = pack.summary?.openSpots ?? null;
    const needsHelp = pack.summary?.needsHelpCount ?? 0;
    if (
      pack.signupReminderSuggested ||
      needsHelp > 0 ||
      (typeof open === "number" && open > 0)
    ) {
      eventsNeedingVolunteers.push({
        eventId: event.id,
        eventTitle: event.title,
        connected: pack.connected,
        openSpots: open,
        needsHelpCount: needsHelp,
        signupReminderSuggested: pack.signupReminderSuggested,
      });
    }
  }

  eventsNeedingVolunteers.sort((a, b) => {
    const score = (row: OrgVolunteersEventSummary) =>
      (row.openSpots ?? 0) + row.needsHelpCount * 2;
    return score(b) - score(a);
  });

  const committeesMissingChairs: Array<{
    committeeName: string;
    eventTitle: string | null;
  }> = [];
  for (const { event, pack } of packs) {
    for (const name of pack.committees.missingChairNames) {
      committeesMissingChairs.push({
        committeeName: name,
        eventTitle: event.title,
      });
    }
  }

  if (slice.length === 0) {
    return emptyOrgVolunteersSection(unavailable);
  }

  return {
    eventsWithVolunteerData,
    eventsNeedingVolunteers: eventsNeedingVolunteers.slice(0, 8),
    committeesMissingChairs: committeesMissingChairs.slice(0, 8),
    unavailable,
  };
}
