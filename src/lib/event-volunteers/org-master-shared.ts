import type { VolunteerAssignmentView } from "@/lib/event-volunteers/types";
import {
  addDaysToDateOnly,
  getTodayDateString,
  parseLocalDate,
} from "@/lib/utils/dates";
import type { EventType } from "@/types/playbooks";

export type VolunteersMasterFilter =
  | "upcoming"
  | "needs_people"
  | "covered"
  | "all"
  | "underfilled";

export type VolunteersMasterTopRole = {
  name: string;
  filledCount: number;
};

export type VolunteersMasterUnderfilledRole = {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  roleName: string;
  openSpots: number;
};

export type VolunteersMasterEventRow = {
  id: string;
  title: string;
  date: string;
  eventType: EventType | null;
  category: string | null;
  /** Approved square / campaign thumbnail URL when available. */
  artworkUrl: string | null;
  fillRatePercent: number | null;
  filledSpots: number | null;
  totalSpots: number | null;
  openSpots: number | null;
  underfilledRoleCount: number;
  topRoles: VolunteersMasterTopRole[];
  roleNames: string[];
  signupUrl: string | null;
  hasSnapshot: boolean;
  isUpcoming60: boolean;
  needsPeople: boolean;
  isCovered: boolean;
};

/** Volunteer fill-rate bands for UI color guidance. */
export type VolunteerFillRateBand =
  | "critical"
  | "needs_attention"
  | "fair_progress"
  | "healthy"
  | "fully_staffed";

export const VOLUNTEER_FILL_RATE_LABELS: Record<VolunteerFillRateBand, string> =
  {
    critical: "Critical",
    needs_attention: "Needs Attention",
    fair_progress: "Fair Progress",
    healthy: "Healthy",
    fully_staffed: "Fully Staffed",
  };

/**
 * Map a 0–100 fill-rate percent to a status band.
 * Null/invalid inputs return null (no bar coloring).
 */
export function getVolunteerFillRateBand(
  percent: number | null | undefined,
): VolunteerFillRateBand | null {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped >= 100) return "fully_staffed";
  if (clamped >= 60) return "healthy";
  if (clamped >= 40) return "fair_progress";
  if (clamped >= 20) return "needs_attention";
  return "critical";
}

export function getVolunteerFillRateLabel(
  percent: number | null | undefined,
): string | null {
  const band = getVolunteerFillRateBand(percent);
  return band ? VOLUNTEER_FILL_RATE_LABELS[band] : null;
}

export type VolunteersMasterKpis = {
  totalVolunteers: number;
  overallFillRatePercent: number | null;
  underfilledRoleCount: number;
  underfilledEventCount: number;
  upcomingEventCount: number;
};

export type VolunteersMasterPageData = {
  events: VolunteersMasterEventRow[];
  kpis: VolunteersMasterKpis;
  thisWeekUnderfilled: VolunteersMasterUnderfilledRole[];
  lastSuccessfulSyncAt: string | null;
};

export const VOLUNTEERS_MASTER_UPCOMING_WINDOW_DAYS = 60;
export const VOLUNTEERS_MASTER_TOP_ROLES_LIMIT = 3;
export const VOLUNTEERS_MASTER_THIS_WEEK_RAIL_LIMIT = 8;

/** Calendar week containing `today` (Sunday start), matching task-hub weeks. */
export function calendarWeekRange(today: string = getTodayDateString()): {
  start: string;
  end: string;
} {
  const parsed = parseLocalDate(today);
  const day = parsed.getDay();
  parsed.setDate(parsed.getDate() - day);
  const start = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  return { start, end: addDaysToDateOnly(start, 6) };
}

export function pickTopRoles(
  assignments: VolunteerAssignmentView[],
  limit = VOLUNTEERS_MASTER_TOP_ROLES_LIMIT,
): VolunteersMasterTopRole[] {
  return [...assignments]
    .filter((row) => typeof row.quantityFilled === "number" && row.quantityFilled > 0)
    .sort((a, b) => (b.quantityFilled ?? 0) - (a.quantityFilled ?? 0))
    .slice(0, limit)
    .map((row) => ({
      name: row.name,
      filledCount: row.quantityFilled ?? 0,
    }));
}

export function listUnderfilledRoles(
  assignments: VolunteerAssignmentView[],
): Array<{ roleName: string; openSpots: number }> {
  return assignments
    .filter((row) => {
      if (typeof row.quantityOpen === "number" && row.quantityOpen > 0) {
        return true;
      }
      return (
        row.availabilityStatus === "high_need" ||
        row.availabilityStatus === "needs_help"
      );
    })
    .map((row) => ({
      roleName: row.name,
      openSpots:
        typeof row.quantityOpen === "number" && row.quantityOpen > 0
          ? row.quantityOpen
          : 1,
    }))
    .sort((a, b) => b.openSpots - a.openSpots);
}

export function computeEventFillStats(assignments: VolunteerAssignmentView[]): {
  fillRatePercent: number | null;
  filledSpots: number | null;
  totalSpots: number | null;
  openSpots: number | null;
} {
  let filled = 0;
  let total = 0;
  let open = 0;
  let complete = assignments.length > 0;

  for (const row of assignments) {
    const requested = row.quantityRequested;
    const filledQty = row.quantityFilled;
    const openQty = row.quantityOpen;
    if (
      typeof requested !== "number" ||
      typeof filledQty !== "number" ||
      typeof openQty !== "number"
    ) {
      complete = false;
      continue;
    }
    total += requested;
    filled += filledQty;
    open += openQty;
  }

  if (!complete || total <= 0) {
    return {
      fillRatePercent: null,
      filledSpots: complete ? filled : null,
      totalSpots: complete ? total : null,
      openSpots: complete ? open : null,
    };
  }

  return {
    fillRatePercent: Math.round((filled / total) * 100),
    filledSpots: filled,
    totalSpots: total,
    openSpots: open,
  };
}

export function buildVolunteersMasterKpis(
  events: VolunteersMasterEventRow[],
): VolunteersMasterKpis {
  let filledSum = 0;
  let totalSum = 0;
  let quantitiesEvents = 0;
  let underfilledRoleCount = 0;
  let underfilledEventCount = 0;
  let upcomingEventCount = 0;

  for (const event of events) {
    if (event.isUpcoming60) {
      upcomingEventCount += 1;
    }
    if (event.underfilledRoleCount > 0) {
      underfilledEventCount += 1;
      underfilledRoleCount += event.underfilledRoleCount;
    }
    if (
      typeof event.filledSpots === "number" &&
      typeof event.totalSpots === "number" &&
      event.totalSpots > 0
    ) {
      filledSum += event.filledSpots;
      totalSum += event.totalSpots;
      quantitiesEvents += 1;
    } else if (typeof event.filledSpots === "number") {
      filledSum += event.filledSpots;
    }
  }

  return {
    totalVolunteers: filledSum,
    overallFillRatePercent:
      quantitiesEvents > 0 && totalSum > 0
        ? Math.round((filledSum / totalSum) * 100)
        : null,
    underfilledRoleCount,
    underfilledEventCount,
    upcomingEventCount,
  };
}

export function eventMatchesVolunteersSearch(
  event: VolunteersMasterEventRow,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (event.title.toLowerCase().includes(needle)) return true;
  return event.roleNames.some((name) => name.toLowerCase().includes(needle));
}

export function filterVolunteersMasterEvents(
  events: VolunteersMasterEventRow[],
  input: { filter: VolunteersMasterFilter; search: string },
): VolunteersMasterEventRow[] {
  return events.filter((event) => {
    if (!eventMatchesVolunteersSearch(event, input.search)) {
      return false;
    }
    switch (input.filter) {
      case "upcoming":
        return event.isUpcoming60;
      case "needs_people":
      case "underfilled":
        return event.needsPeople;
      case "covered":
        return event.isCovered;
      case "all":
        return true;
    }
  });
}

export function emptyVolunteersMasterPageData(): VolunteersMasterPageData {
  return {
    events: [],
    kpis: {
      totalVolunteers: 0,
      overallFillRatePercent: null,
      underfilledRoleCount: 0,
      underfilledEventCount: 0,
      upcomingEventCount: 0,
    },
    thisWeekUnderfilled: [],
    lastSuccessfulSyncAt: null,
  };
}
