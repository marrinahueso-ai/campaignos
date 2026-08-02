import {
  getVolunteerFillRateBand,
  VOLUNTEER_FILL_RATE_LABELS,
} from "@/lib/event-volunteers/org-master-shared";
import type {
  VolunteerAssignmentView,
  VolunteerParticipantView,
} from "@/lib/event-volunteers/types";

export type VolunteerRosterRoleCard = {
  assignment: VolunteerAssignmentView;
  people: VolunteerParticipantView[];
  openSlots: number;
  fillPercent: number | null;
};

export type VolunteerRosterSectionBadge = "on_track" | "needs_attention";

export type VolunteerRosterSection = {
  id: string;
  title: string;
  badge: VolunteerRosterSectionBadge;
  fillPercent: number | null;
  /** Aggregate filled slots when quantities exist. */
  filledSpots: number | null;
  /** Aggregate requested slots when quantities exist. */
  totalSpots: number | null;
  roles: VolunteerRosterRoleCard[];
};

/** Progress-bar tone for Pilot accordion role lines. */
export type RosterProgressTone = "emerald" | "gold" | "rose" | "muted";

export function rosterProgressTone(
  fillPercent: number | null,
): RosterProgressTone {
  const band = getVolunteerFillRateBand(fillPercent);
  if (!band) return "muted";
  if (band === "fully_staffed" || band === "healthy") return "emerald";
  if (band === "fair_progress" || band === "needs_attention") return "gold";
  return "rose";
}

function roleFillPercent(assignment: VolunteerAssignmentView): number | null {
  const requested = assignment.quantityRequested;
  const filled = assignment.quantityFilled;
  if (
    typeof requested !== "number" ||
    requested <= 0 ||
    typeof filled !== "number"
  ) {
    return null;
  }
  return Math.round((filled / requested) * 100);
}

function sectionTotals(roles: VolunteerRosterRoleCard[]): {
  fillPercent: number | null;
  filledSpots: number | null;
  totalSpots: number | null;
  badge: VolunteerRosterSectionBadge;
} {
  let requested = 0;
  let filled = 0;
  let hasQuantities = false;
  for (const role of roles) {
    if (
      typeof role.assignment.quantityRequested === "number" &&
      typeof role.assignment.quantityFilled === "number"
    ) {
      hasQuantities = true;
      requested += role.assignment.quantityRequested;
      filled += role.assignment.quantityFilled;
    }
  }
  const fillPercent =
    hasQuantities && requested > 0
      ? Math.round((filled / requested) * 100)
      : null;
  const band = getVolunteerFillRateBand(fillPercent);
  const needsAttention =
    band === "critical" ||
    band === "needs_attention" ||
    band === "fair_progress" ||
    roles.some(
      (role) =>
        role.assignment.availabilityStatus === "high_need" ||
        role.assignment.availabilityStatus === "needs_help",
    );
  return {
    fillPercent,
    filledSpots: hasQuantities ? filled : null,
    totalSpots: hasQuantities ? requested : null,
    badge: needsAttention ? "needs_attention" : "on_track",
  };
}

function buildRoleCard(
  assignment: VolunteerAssignmentView,
  participants: VolunteerParticipantView[],
): VolunteerRosterRoleCard {
  const people = participants.filter(
    (person) => person.assignmentExternalKey === assignment.externalKey,
  );
  const openSlots = Math.max(0, assignment.quantityOpen ?? 0);
  return {
    assignment,
    people,
    openSlots,
    fillPercent: roleFillPercent(assignment),
  };
}

/**
 * Grouped roster hierarchy for Pilot Grouped View.
 * Prefer assignment.groupName when present; otherwise a single honest "Roles" section.
 */
export function buildVolunteerRosterSections(
  assignments: VolunteerAssignmentView[],
  participants: VolunteerParticipantView[],
): VolunteerRosterSection[] {
  const hasGroupNames = assignments.some(
    (assignment) => Boolean(assignment.groupName?.trim()),
  );

  if (!hasGroupNames) {
    const roles = assignments.map((assignment) =>
      buildRoleCard(assignment, participants),
    );
    const { fillPercent, filledSpots, totalSpots, badge } =
      sectionTotals(roles);
    return [
      {
        id: "roles",
        title: "Roles",
        badge,
        fillPercent,
        filledSpots,
        totalSpots,
        roles,
      },
    ];
  }

  const byGroup = new Map<string, VolunteerAssignmentView[]>();
  for (const assignment of assignments) {
    const key = assignment.groupName?.trim() || "Other roles";
    const list = byGroup.get(key) ?? [];
    list.push(assignment);
    byGroup.set(key, list);
  }

  return [...byGroup.entries()].map(([title, groupAssignments]) => {
    const roles = groupAssignments.map((assignment) =>
      buildRoleCard(assignment, participants),
    );
    const { fillPercent, filledSpots, totalSpots, badge } =
      sectionTotals(roles);
    return {
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      badge,
      fillPercent,
      filledSpots,
      totalSpots,
      roles,
    };
  });
}

export function rosterSectionBadgeLabel(
  badge: VolunteerRosterSectionBadge,
): string {
  return badge === "needs_attention" ? "Needs Attention" : "On Track";
}

export function rosterFillBandLabel(percent: number | null): string | null {
  const band = getVolunteerFillRateBand(percent);
  return band ? VOLUNTEER_FILL_RATE_LABELS[band] : null;
}
