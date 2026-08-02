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
