import type {
  VolunteerAssignmentView,
  VolunteerAvailabilityStatus,
  VolunteerSignupAssignment,
  VolunteerSignupSnapshot,
  VolunteerStatsSummary,
} from "@/lib/event-volunteers/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function coerceNonNegativeInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.floor(n);
}

export function computeAssignmentOpen(
  requested: number | null,
  filled: number | null,
): number | null {
  if (!isFiniteNumber(requested) || !isFiniteNumber(filled)) {
    return null;
  }
  return Math.max(0, requested - filled);
}

export function computeTotalsFromAssignments(
  assignments: VolunteerSignupAssignment[],
): VolunteerSignupSnapshot["totals"] & { quantitiesComplete: boolean } {
  let total = 0;
  let filled = 0;
  let open = 0;
  let complete = assignments.length > 0;

  for (const assignment of assignments) {
    const requested = assignment.quantityRequested;
    const filledQty = assignment.quantityFilled;
    const openQty =
      assignment.quantityOpen ??
      computeAssignmentOpen(requested, filledQty);

    if (
      !isFiniteNumber(requested) ||
      !isFiniteNumber(filledQty) ||
      !isFiniteNumber(openQty)
    ) {
      complete = false;
      continue;
    }
    total += requested;
    filled += filledQty;
    open += openQty;
  }

  if (assignments.length === 0) {
    return {
      totalSpots: null,
      filledSpots: null,
      openSpots: null,
      quantitiesComplete: false,
    };
  }

  if (!complete) {
    return {
      totalSpots: null,
      filledSpots: null,
      openSpots: null,
      quantitiesComplete: false,
    };
  }

  return {
    totalSpots: total,
    filledSpots: filled,
    openSpots: open,
    quantitiesComplete: true,
  };
}

export function classifyAssignments(
  assignments: VolunteerSignupAssignment[],
): VolunteerAssignmentView[] {
  const withOpen = assignments.map((assignment, index) => {
    const quantityOpen =
      assignment.quantityOpen ??
      computeAssignmentOpen(
        assignment.quantityRequested,
        assignment.quantityFilled,
      );
    return { assignment, index, quantityOpen };
  });

  const activeOpenCounts = withOpen
    .map((entry) => entry.quantityOpen)
    .filter((value): value is number => isFiniteNumber(value) && value > 0);
  const maxOpen =
    activeOpenCounts.length > 0 ? Math.max(...activeOpenCounts) : null;

  return withOpen.map(({ assignment, index, quantityOpen }) => {
    const status = resolveAvailabilityStatus({
      quantityRequested: assignment.quantityRequested,
      quantityFilled: assignment.quantityFilled,
      quantityOpen,
      maxOpenAmongActive: maxOpen,
    });

    return {
      ...assignment,
      quantityOpen,
      availabilityStatus: status,
      sourceOrder: index,
    };
  });
}

export function resolveAvailabilityStatus(input: {
  quantityRequested: number | null;
  quantityFilled: number | null;
  quantityOpen: number | null;
  maxOpenAmongActive: number | null;
}): VolunteerAvailabilityStatus {
  const { quantityRequested, quantityFilled, quantityOpen, maxOpenAmongActive } =
    input;

  if (
    !isFiniteNumber(quantityRequested) ||
    !isFiniteNumber(quantityFilled) ||
    !isFiniteNumber(quantityOpen)
  ) {
    return "unknown";
  }

  if (quantityOpen === 0) {
    return "full";
  }

  const isLargestNeed =
    isFiniteNumber(maxOpenAmongActive) &&
    quantityOpen === maxOpenAmongActive &&
    quantityOpen > 0;
  const zeroFilled = quantityFilled === 0;

  if (zeroFilled || isLargestNeed) {
    return "high_need";
  }

  const openRatio =
    quantityRequested > 0 ? quantityOpen / quantityRequested : 1;

  if (openRatio > 0.25) {
    return "needs_help";
  }

  return "nearly_full";
}

export function summarizeAssignments(
  assignments: VolunteerAssignmentView[],
  totals: VolunteerSignupSnapshot["totals"],
  quantitiesComplete: boolean,
): VolunteerStatsSummary {
  let fullAssignmentCount = 0;
  let needsHelpCount = 0;
  let nearlyFullCount = 0;
  let unknownAssignmentCount = 0;

  for (const assignment of assignments) {
    switch (assignment.availabilityStatus) {
      case "full":
        fullAssignmentCount += 1;
        break;
      case "high_need":
      case "needs_help":
        needsHelpCount += 1;
        break;
      case "nearly_full":
        nearlyFullCount += 1;
        break;
      case "unknown":
        unknownAssignmentCount += 1;
        break;
    }
  }

  const overallFilledPercent =
    quantitiesComplete &&
    isFiniteNumber(totals.totalSpots) &&
    totals.totalSpots > 0 &&
    isFiniteNumber(totals.filledSpots)
      ? Math.round((totals.filledSpots / totals.totalSpots) * 100)
      : null;

  return {
    totalSpots: quantitiesComplete ? totals.totalSpots : null,
    filledSpots: quantitiesComplete ? totals.filledSpots : null,
    openSpots: quantitiesComplete ? totals.openSpots : null,
    overallFilledPercent,
    fullAssignmentCount,
    needsHelpCount,
    nearlyFullCount,
    unknownAssignmentCount,
    assignmentCount: assignments.length,
    quantitiesComplete,
  };
}

export function buildSnapshotFromAssignments(
  base: Omit<VolunteerSignupSnapshot, "totals" | "assignments" | "quantitiesComplete"> & {
    assignments: VolunteerSignupAssignment[];
  },
): {
  snapshot: VolunteerSignupSnapshot;
  classified: VolunteerAssignmentView[];
  summary: VolunteerStatsSummary;
} {
  const totalsResult = computeTotalsFromAssignments(base.assignments);
  const classified = classifyAssignments(
    base.assignments.map((assignment) => ({
      ...assignment,
      quantityOpen:
        assignment.quantityOpen ??
        computeAssignmentOpen(
          assignment.quantityRequested,
          assignment.quantityFilled,
        ),
    })),
  );
  const snapshot: VolunteerSignupSnapshot = {
    ...base,
    totals: {
      totalSpots: totalsResult.totalSpots,
      filledSpots: totalsResult.filledSpots,
      openSpots: totalsResult.openSpots,
    },
    assignments: classified,
    quantitiesComplete: totalsResult.quantitiesComplete,
  };
  const summary = summarizeAssignments(
    classified,
    snapshot.totals,
    snapshot.quantitiesComplete,
  );
  return { snapshot, classified, summary };
}

export function availabilityStatusLabel(
  status: VolunteerAvailabilityStatus,
): string {
  switch (status) {
    case "high_need":
      return "High Need";
    case "needs_help":
      return "Needs Help";
    case "nearly_full":
      return "Nearly Full";
    case "full":
      return "Full";
    case "unknown":
      return "Unknown";
  }
}
