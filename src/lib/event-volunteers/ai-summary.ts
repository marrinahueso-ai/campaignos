import type {
  VolunteerAssignmentView,
  VolunteerSnapshotRecord,
  VolunteerStatsSummary,
} from "@/lib/event-volunteers/types";
import { availabilityStatusLabel } from "@/lib/event-volunteers/stats";

export type VolunteerAiSummary = {
  headline: string;
  bullets: string[];
  suggestedMessage: string;
  staleNote: string | null;
};

function formatCount(n: number | null | undefined, fallback = "an unknown number of"): string {
  if (typeof n === "number" && Number.isFinite(n)) {
    return String(n);
  }
  return fallback;
}

export function buildVolunteerAiSummary(input: {
  summary: VolunteerStatsSummary;
  assignments: VolunteerAssignmentView[];
  lastSuccessfulSyncAt: string | null;
  syncFailed: boolean;
  previousSummary?: VolunteerStatsSummary | null;
}): VolunteerAiSummary {
  const { summary, assignments, lastSuccessfulSyncAt, syncFailed, previousSummary } =
    input;

  const open = summary.openSpots;
  const assignmentCount = summary.assignmentCount;

  const headline =
    open === null
      ? `Volunteer coverage is available across ${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"}, but some quantities could not be calculated.`
      : `${formatCount(open)} spot${open === 1 ? "" : "s"} remain across ${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"}.`;

  const bullets: string[] = [];

  const rankedByOpen = [...assignments]
    .filter((a) => typeof a.quantityOpen === "number")
    .sort((a, b) => (b.quantityOpen ?? 0) - (a.quantityOpen ?? 0));

  const mostOpen = rankedByOpen[0];
  if (mostOpen && (mostOpen.quantityOpen ?? 0) > 0) {
    bullets.push(
      `${mostOpen.name} has the greatest need (${mostOpen.quantityOpen} opening${mostOpen.quantityOpen === 1 ? "" : "s"}).`,
    );
  }

  const nearlyFull = assignments.find(
    (a) => a.availabilityStatus === "nearly_full",
  );
  if (nearlyFull) {
    bullets.push(
      `${nearlyFull.name} is nearly full (${nearlyFull.quantityOpen ?? 0} opening${(nearlyFull.quantityOpen ?? 0) === 1 ? "" : "s"}).`,
    );
  }

  if (summary.fullAssignmentCount > 0) {
    bullets.push(
      `${summary.fullAssignmentCount} assignment${summary.fullAssignmentCount === 1 ? "" : "s"} fully staffed.`,
    );
  }

  if (previousSummary && previousSummary.openSpots !== null && open !== null) {
    if (open < previousSummary.openSpots) {
      bullets.push("Signup progress has increased since the previous snapshot.");
    } else if (open > previousSummary.openSpots) {
      bullets.push("Open spots increased since the previous snapshot.");
    } else {
      bullets.push("Open spot count is unchanged since the previous snapshot.");
    }
  } else if (open !== null && open > 0) {
    bullets.push("You may want to send a reminder this week.");
  }

  if (!summary.quantitiesComplete) {
    bullets.push("Some assignment quantities are unknown, so totals may be partial.");
  }

  const topNeeds = rankedByOpen
    .filter((a) => (a.quantityOpen ?? 0) > 0)
    .slice(0, 3)
    .map((a) => `• ${a.name}: ${a.quantityOpen} open`)
    .join("\n");

  const suggestedMessage =
    open === null
      ? "Friendly reminder: we still need volunteers for our upcoming event. Please check the signup for open shifts."
      : `Friendly reminder: we still need ${open} volunteer spot${open === 1 ? "" : "s"} filled.\n\n${topNeeds || "Please grab an open shift if you can."}\n\nThank you!`;

  const staleNote =
    syncFailed && lastSuccessfulSyncAt
      ? `Volunteer stats could not be refreshed. Showing the last successful update from ${formatSyncTime(lastSuccessfulSyncAt)}.`
      : null;

  return { headline, bullets, suggestedMessage, staleNote };
}

export function formatSyncTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function describeNeedsSnapshot(assignments: VolunteerAssignmentView[]) {
  const highNeed = assignments.filter((a) => a.availabilityStatus === "high_need");
  const needsHelp = assignments.filter((a) => a.availabilityStatus === "needs_help");
  const nearlyFull = assignments.filter(
    (a) => a.availabilityStatus === "nearly_full",
  );
  const full = assignments.filter((a) => a.availabilityStatus === "full");

  const sumOpen = (list: VolunteerAssignmentView[]) =>
    list.reduce((sum, a) => sum + (a.quantityOpen ?? 0), 0);

  return [
    {
      status: "high_need" as const,
      label: availabilityStatusLabel("high_need"),
      assignmentCount: highNeed.length,
      openSpots: sumOpen(highNeed),
    },
    {
      status: "needs_help" as const,
      label: availabilityStatusLabel("needs_help"),
      assignmentCount: needsHelp.length,
      openSpots: sumOpen(needsHelp),
    },
    {
      status: "nearly_full" as const,
      label: availabilityStatusLabel("nearly_full"),
      assignmentCount: nearlyFull.length,
      openSpots: sumOpen(nearlyFull),
    },
    {
      status: "full" as const,
      label: availabilityStatusLabel("full"),
      assignmentCount: full.length,
      openSpots: 0,
    },
  ];
}

export function snapshotToSummary(snapshot: VolunteerSnapshotRecord): VolunteerStatsSummary {
  return snapshot.summary;
}
