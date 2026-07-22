import type {
  VolunteerAssignmentView,
  VolunteerAvailabilityStatus,
  VolunteerSignupAssignment,
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

/**
 * Sticky date allowlist stored on `event_volunteer_sources.included_assignment_dates`.
 * - `null` → include all dates (backward compatible / no filter)
 * - string[] → ISO start dates (`YYYY-MM-DD`) and/or {@link NO_DATE_FILTER}
 */
export type AssignmentDateAllowlist = string[] | null;

export type AssignmentDateOption = {
  value: AssignmentDateFilter;
  label: string;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when value is an ISO date or the undated sentinel. */
export function isValidAllowlistDateToken(value: string): boolean {
  return value === NO_DATE_FILTER || ISO_DATE_RE.test(value);
}

/**
 * Normalize a user-selected allowlist: dedupe, validate tokens, reject empty.
 */
export function normalizeDateAllowlist(
  selected: string[],
): { ok: true; dates: string[] } | { ok: false; error: string } {
  const dates = [
    ...new Set(
      selected
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];

  if (dates.length === 0) {
    return { ok: false, error: "Select at least one date to include." };
  }

  for (const date of dates) {
    if (!isValidAllowlistDateToken(date)) {
      return { ok: false, error: "One or more selected dates are invalid." };
    }
  }

  dates.sort((a, b) => {
    if (a === NO_DATE_FILTER) return 1;
    if (b === NO_DATE_FILTER) return -1;
    return a.localeCompare(b);
  });

  return { ok: true, dates };
}

/**
 * Default review selection: every detected date, plus No date when undated rows exist.
 */
export function defaultDateAllowlistFromAssignments(
  assignments: Array<Pick<VolunteerSignupAssignment, "date">>,
): string[] {
  const dates = new Set<string>();
  let hasNoDate = false;

  for (const assignment of assignments) {
    if (assignment.date) {
      dates.add(assignment.date);
    } else {
      hasNoDate = true;
    }
  }

  const allowlist = [...dates].sort((a, b) => a.localeCompare(b));
  if (hasNoDate) {
    allowlist.push(NO_DATE_FILTER);
  }
  return allowlist;
}

/**
 * Filter assignments by sticky date allowlist (start date only).
 * `null` / `undefined` keeps all rows for backward compatibility.
 */
export function filterAssignmentsByDateAllowlist<
  T extends Pick<VolunteerSignupAssignment, "date">,
>(assignments: T[], allowlist: AssignmentDateAllowlist | undefined): T[] {
  if (allowlist == null) {
    return assignments;
  }

  const allowed = new Set(allowlist);
  return assignments.filter((assignment) => {
    if (!assignment.date) {
      return allowed.has(NO_DATE_FILTER);
    }
    return allowed.has(assignment.date);
  });
}

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
