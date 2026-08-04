import { NO_DATE_FILTER, type AssignmentDateAllowlist } from "@/lib/event-volunteers/assignment-list";
import type { VolunteerSignupParticipant } from "@/lib/event-volunteers/types";

/**
 * Filter participants by sticky date allowlist (start date only), matching assignments.
 */
export function filterParticipantsByDateAllowlist<
  T extends Pick<VolunteerSignupParticipant, "date">,
>(participants: T[], allowlist: AssignmentDateAllowlist | undefined): T[] {
  if (allowlist == null) {
    return participants;
  }

  const allowed = new Set(allowlist);
  return participants.filter((participant) => {
    if (!participant.date) {
      return allowed.has(NO_DATE_FILTER);
    }
    return allowed.has(participant.date);
  });
}

/** Keep participants whose assignment key remains after assignment filtering. */
export function filterParticipantsByAssignmentKeys<
  T extends Pick<VolunteerSignupParticipant, "assignmentExternalKey">,
>(participants: T[], assignmentExternalKeys: Iterable<string>): T[] {
  const allowed = new Set(assignmentExternalKeys);
  return participants.filter((participant) =>
    allowed.has(participant.assignmentExternalKey),
  );
}

export function filterParticipantsBySearch<
  T extends Pick<VolunteerSignupParticipant, "name" | "roleName">,
>(participants: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return participants;
  return participants.filter(
    (participant) =>
      participant.name.toLowerCase().includes(needle) ||
      participant.roleName.toLowerCase().includes(needle),
  );
}

export function filterParticipantsByRole<
  T extends Pick<VolunteerSignupParticipant, "roleName">,
>(participants: T[], roleName: string | null): T[] {
  if (!roleName) return participants;
  return participants.filter((participant) => participant.roleName === roleName);
}

export type VolunteerListSortField =
  | "volunteer"
  | "role"
  | "shift"
  | "location"
  | "status";

export type VolunteerSortDirection = "asc" | "desc";

export const DEFAULT_VOLUNTEER_LIST_SORT_FIELD: VolunteerListSortField =
  "volunteer";
export const DEFAULT_VOLUNTEER_SORT_DIRECTION: VolunteerSortDirection = "asc";

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function shiftSortKey(startTime?: string, endTime?: string): string {
  return `${startTime ?? ""}\0${endTime ?? ""}`;
}

export function sortParticipants<
  T extends Pick<
    VolunteerSignupParticipant,
    "name" | "roleName" | "startTime" | "endTime" | "location" | "status"
  >,
>(
  participants: T[],
  field: VolunteerListSortField = DEFAULT_VOLUNTEER_LIST_SORT_FIELD,
  direction: VolunteerSortDirection = DEFAULT_VOLUNTEER_SORT_DIRECTION,
): T[] {
  const mul = direction === "asc" ? 1 : -1;
  return [...participants].sort((left, right) => {
    let cmp = 0;
    switch (field) {
      case "volunteer":
        cmp = compareText(left.name, right.name);
        break;
      case "role":
        cmp = compareText(left.roleName, right.roleName);
        break;
      case "shift":
        cmp = compareText(
          shiftSortKey(left.startTime, left.endTime),
          shiftSortKey(right.startTime, right.endTime),
        );
        break;
      case "location":
        cmp = compareText(left.location ?? "", right.location ?? "");
        break;
      case "status":
        cmp = compareText(left.status, right.status);
        break;
    }
    if (cmp !== 0) return cmp * mul;
    return compareText(left.name, right.name) * mul;
  });
}

export function nextVolunteerSortState<TField extends string>(
  currentField: TField,
  currentDirection: VolunteerSortDirection,
  nextField: TField,
): { field: TField; direction: VolunteerSortDirection } {
  if (currentField === nextField) {
    return {
      field: currentField,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }
  return { field: nextField, direction: "asc" };
}

export function volunteerInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function formatParticipantShiftTime(
  startTime?: string,
  endTime?: string,
): string {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;
  return "—";
}

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number,
): { pageItems: T[]; page: number; pageCount: number; total: number } {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}
