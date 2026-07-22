import type {
  VolunteerAssignmentView,
  VolunteerAvailabilityStatus,
} from "@/lib/event-volunteers/types";

export type AssignmentStatusFilter = "all" | VolunteerAvailabilityStatus;
export type AssignmentSortId =
  | "most_needed"
  | "least_filled"
  | "most_filled"
  | "date"
  | "name";

/** Sentinel value for assignments with a missing/null date. */
export const NO_DATE_FILTER = "__none__";

export type AssignmentDateFilter = "all" | typeof NO_DATE_FILTER | string;

export type AssignmentDateOption = {
  value: AssignmentDateFilter;
  label: string;
};

/** Short weekday/month/day label matching Volunteer Assignments table style. */
export function formatAssignmentDateLabel(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

/**
 * Distinct shift dates from the current assignments list, sorted ascending.
 * Includes a "No date" option when any assignment lacks a date.
 */
export function listAssignmentDateOptions(
  assignments: VolunteerAssignmentView[],
): AssignmentDateOption[] {
  const dates = new Set<string>();
  let hasNoDate = false;

  for (const assignment of assignments) {
    if (assignment.date) {
      dates.add(assignment.date);
    } else {
      hasNoDate = true;
    }
  }

  const options: AssignmentDateOption[] = [...dates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      value: date,
      label: formatAssignmentDateLabel(date),
    }));

  if (hasNoDate) {
    options.push({ value: NO_DATE_FILTER, label: "No date" });
  }

  return options;
}

export function filterAndSortAssignments(
  assignments: VolunteerAssignmentView[],
  options: {
    filter: AssignmentStatusFilter;
    dateFilter: AssignmentDateFilter;
    sort: AssignmentSortId;
  },
): VolunteerAssignmentView[] {
  const { filter, dateFilter, sort } = options;
  let list = [...assignments];

  if (filter === "needs_help") {
    list = list.filter(
      (a) =>
        a.availabilityStatus === "needs_help" ||
        a.availabilityStatus === "high_need",
    );
  } else if (filter !== "all") {
    list = list.filter((a) => a.availabilityStatus === filter);
  }

  if (dateFilter === NO_DATE_FILTER) {
    list = list.filter((a) => !a.date);
  } else if (dateFilter !== "all") {
    list = list.filter((a) => a.date === dateFilter);
  }

  list.sort((a, b) => {
    switch (sort) {
      case "most_needed":
        return (b.quantityOpen ?? -1) - (a.quantityOpen ?? -1);
      case "least_filled":
        return (a.quantityFilled ?? 999) - (b.quantityFilled ?? 999);
      case "most_filled":
        return (b.quantityFilled ?? -1) - (a.quantityFilled ?? -1);
      case "date":
        return `${a.date ?? ""} ${a.startTime ?? ""}`.localeCompare(
          `${b.date ?? ""} ${b.startTime ?? ""}`,
        );
      case "name":
        return a.name.localeCompare(b.name);
    }
  });

  return list;
}
