import type { ProductHelpLink } from "./product-help-knowledge.ts";

export type VolunteerShiftNeed = {
  name: string;
  openSpots: number | null;
  status: string;
  groupName: string | null;
};

export type VolunteerCommitteeStatus = {
  name: string;
  hasChair: boolean;
  openSpotsInGroup: number | null;
  behindReason: string | null;
};

export type VolunteersContextSection = {
  connected: boolean;
  sourceStatus: string | null;
  lastSuccessfulSyncAt: string | null;
  summary: {
    openSpots: number | null;
    filledSpots: number | null;
    totalSpots: number | null;
    filledPercent: number | null;
    needsHelpCount: number;
    assignmentCount: number;
  } | null;
  shiftsNeedingHelp: VolunteerShiftNeed[];
  signupReminderSuggested: boolean;
  committees: {
    tiedCount: number;
    withChairCount: number;
    missingChairNames: string[];
    behind: VolunteerCommitteeStatus[];
  };
  /** Honest gaps — never invent answers for these. */
  unavailable: string[];
};

export type OrgVolunteersEventSummary = {
  eventId: string;
  eventTitle: string;
  connected: boolean;
  openSpots: number | null;
  needsHelpCount: number;
  signupReminderSuggested: boolean;
};

export type OrgVolunteersContextSection = {
  eventsWithVolunteerData: number;
  eventsNeedingVolunteers: OrgVolunteersEventSummary[];
  committeesMissingChairs: Array<{
    committeeName: string;
    eventTitle: string | null;
  }>;
  unavailable: string[];
};

export function emptyVolunteersSection(
  unavailable: string[] = [],
): VolunteersContextSection {
  return {
    connected: false,
    sourceStatus: null,
    lastSuccessfulSyncAt: null,
    summary: null,
    shiftsNeedingHelp: [],
    signupReminderSuggested: false,
    committees: {
      tiedCount: 0,
      withChairCount: 0,
      missingChairNames: [],
      behind: [],
    },
    unavailable,
  };
}

export function emptyOrgVolunteersSection(
  unavailable: string[] = [],
): OrgVolunteersContextSection {
  return {
    eventsWithVolunteerData: 0,
    eventsNeedingVolunteers: [],
    committeesMissingChairs: [],
    unavailable,
  };
}

/** Deterministic volunteer lines for event ops answers. */
export function formatVolunteersSectionLines(
  section: VolunteersContextSection,
): string[] {
  const lines: string[] = [];

  if (!section.connected || !section.summary) {
    lines.push(
      "Volunteers: SignUpGenius isn’t connected (or no confirmed snapshot yet) — open the Volunteers tab to connect and sync.",
    );
  } else {
    const { summary } = section;
    const openLabel =
      summary.openSpots == null
        ? "open spots unknown"
        : `${summary.openSpots} open spot${summary.openSpots === 1 ? "" : "s"}`;
    const fillLabel =
      summary.filledPercent == null ? "" : ` (${summary.filledPercent}% filled)`;
    lines.push(
      `Volunteers: ${openLabel}${fillLabel}; ${summary.needsHelpCount} shift${
        summary.needsHelpCount === 1 ? "" : "s"
      } still needing help across ${summary.assignmentCount} assignment${
        summary.assignmentCount === 1 ? "" : "s"
      }.`,
    );
    if (section.shiftsNeedingHelp.length > 0) {
      lines.push(
        `Shifts needing help: ${section.shiftsNeedingHelp
          .slice(0, 4)
          .map(
            (shift) =>
              `${shift.name}${
                shift.openSpots == null ? "" : ` (${shift.openSpots} open)`
              }`,
          )
          .join("; ")}.`,
      );
    }
    if (section.signupReminderSuggested) {
      lines.push(
        "Signup reminder: yes — open spots remain; consider sending another reminder.",
      );
    } else {
      lines.push("Signup reminder: not urgently needed from the latest snapshot.");
    }
  }

  if (section.committees.tiedCount > 0) {
    if (section.committees.missingChairNames.length > 0) {
      lines.push(
        `Committee chairs: ${section.committees.missingChairNames.length} of ${section.committees.tiedCount} event committee${
          section.committees.tiedCount === 1 ? "" : "s"
        } missing a chair (${section.committees.missingChairNames
          .slice(0, 3)
          .join(", ")}).`,
      );
    } else {
      lines.push(
        `Committee chairs: all ${section.committees.tiedCount} event-tied committee${
          section.committees.tiedCount === 1 ? "" : "s"
        } have a chair assigned.`,
      );
    }
    if (section.committees.behind.length > 0) {
      lines.push(
        `Committees behind: ${section.committees.behind
          .slice(0, 3)
          .map((c) => `${c.name} (${c.behindReason})`)
          .join("; ")}.`,
      );
    }
  }

  lines.push(
    `I can’t see yet: ${section.unavailable.slice(0, 2).join("; ")}.`,
  );

  return lines;
}

export function formatOrgVolunteersSectionLines(
  section: OrgVolunteersContextSection,
): string[] {
  const lines: string[] = [];
  if (section.eventsNeedingVolunteers.length === 0) {
    lines.push(
      section.eventsWithVolunteerData > 0
        ? "Volunteers: no active events flagged with open spots in the loaded SignUpGenius snapshots."
        : "Volunteers: no connected SignUpGenius snapshots on the loaded campaigns yet.",
    );
  } else {
    const samples = section.eventsNeedingVolunteers
      .slice(0, 4)
      .map((event) => {
        const open =
          event.openSpots == null ? "needs help" : `${event.openSpots} open`;
        return `${event.eventTitle} (${open})`;
      })
      .join("; ");
    lines.push(
      `Volunteers needing attention (${section.eventsNeedingVolunteers.length}): ${samples}.`,
    );
  }

  if (section.committeesMissingChairs.length > 0) {
    lines.push(
      `Committees missing chairs: ${section.committeesMissingChairs
        .slice(0, 3)
        .map(
          (row) =>
            `${row.committeeName}${
              row.eventTitle ? ` (${row.eventTitle})` : ""
            }`,
        )
        .join("; ")}.`,
    );
  }

  lines.push(
    `I can’t see yet: ${section.unavailable.slice(0, 2).join("; ")}.`,
  );
  return lines;
}

export function serializeVolunteersForPrompt(
  section: VolunteersContextSection,
): unknown {
  return {
    connected: section.connected,
    sourceStatus: section.sourceStatus,
    summary: section.summary,
    shiftsNeedingHelp: section.shiftsNeedingHelp.map((shift) => ({
      name: shift.name,
      openSpots: shift.openSpots,
      status: shift.status,
    })),
    signupReminderSuggested: section.signupReminderSuggested,
    committees: section.committees,
    unavailable: section.unavailable,
  };
}

export function serializeOrgVolunteersForPrompt(
  section: OrgVolunteersContextSection,
): unknown {
  return {
    eventsWithVolunteerData: section.eventsWithVolunteerData,
    eventsNeedingVolunteers: section.eventsNeedingVolunteers,
    committeesMissingChairs: section.committeesMissingChairs,
    unavailable: section.unavailable,
  };
}

export function volunteersEventLinks(eventId: string): ProductHelpLink[] {
  return [
    {
      label: "Volunteers",
      href: `/events/${encodeURIComponent(eventId)}?tab=volunteers`,
    },
    {
      label: "Responsibilities",
      href: `/events/${encodeURIComponent(eventId)}?tab=responsibilities`,
    },
  ];
}
